console.log('Global Preload');

const currentApp = window.fin.Application.getCurrentSync();
const currentWindow = fin.me.isWindow ? window.fin.Window.getCurrentSync() : undefined;

//HACK: this belongs in the frameContentPreload
//      but is used before the load operation completes
//      so must be defined earlier
const contextListeners = [];
window._contextListeners = contextListeners;
window._fdc3 = {
    addContextListener: function(listener) {
        console.log('addContextListener');
        contextListeners.push(listener);
    }
};

let goldenLayout;
Object.defineProperty(window, 'GoldenLayout', {
    get() { return goldenLayout; },
    set(value) {
        class CustomLayout extends value.GoldenLayout {
            constructor(config, container) {
                super(config, container);
            }

            registerComponent(name, Component) {
                class ExComponent extends Component {
                    constructor(container, state) {
                        super(container, state);

                        container.on('tab', tab => { 
                            console.log('tab created', tab);

                            let channelIcon = $(`<span style="padding: 0px 8px;">&#11044;</span>`);

                            let setChannel = function() {
                                console.log('setChannel');
                                let tabComponentState = tab.contentItem.config.componentState;
                                let { contextChannel = 'default' } = tabComponentState && tabComponentState.customData || {};
                                channelIcon.css({color: `var(--channel-${contextChannel})`});
                            };

                            tab.contentItem.on('stateChanged', setChannel);
                            setChannel();

                            document.body.addEventListener('fdc3-channel-changed', evt => {
                                if(evt.detail.identity.name.includes(tab.contentItem.config.componentState.name)) {
                                    let { customData = {}} = container.getState();
                                    Object.assign(customData, { contextChannel: evt.detail.channel.id });
                                    container.extendState({ customData });
                                }
                            });

                            tab.element.children('.lm_left').after(channelIcon);
                        });
                    }
                }
                
                super.registerComponent(name, ExComponent);
            }
        }

        goldenLayout = {
            GoldenLayout: CustomLayout
        }
    }
});

window.addEventListener('load', () => {
    if (location.protocol === 'file:' && location.href.includes('standard-frame-provider')) {
        standardFrameProviderPreload();
    }
    else if (location.protocol === 'file:' && location.href.includes('standard-frame')) {
        standardFramePreload();
    }
    else if (fin.me.name.startsWith('fdc3/')) {
        fdc3ProxyWindowPreload();
    }
    else if (location.origin.includes('tier1crm')) {
        contactDetailPreload();
    }
    else {
        frameContentPreload();
    }
});

async function standardFrameProviderPreload() {
    console.log('Standard Frame Provider Preload');

    const windowCreate = fin.Window.create;

    fin.Window.create = function(opts) {
        if(opts.layout && opts.layout.content) {
            console.log('Patching view names...');
            autoNameViews(opts.layout.content);
            createFdc3ProxyWindows(opts.layout.content);
        }

        opts.autoShow = false;
        
        return windowCreate.call(fin.Window, opts);
    };

    function autoNameViews(content) {
        content.forEach(entry => {
            if(entry.content) {
                autoNameViews(entry.content);
            }
            if(entry.type === "component" &&
                entry.componentName === "view" &&
                entry.componentState &&
                !entry.componentState.name) {
                    entry.componentState.name = fin.desktop.getUuid();
                }
        });
    }

    function createFdc3ProxyWindows(content) {
        content.forEach(entry => {
            if(entry.content) {
                createFdc3ProxyWindows(entry.content);
            }
            if(entry.type === "component" &&
                entry.componentName === "view") {
                windowCreate.call(fin.Window, {
                    name: 'fdc3/' + entry.componentState.name,
                    url: 'about:blank',
                    autoShow: true,
                    frame: false,
                    defaultHeight: 40,
                    defaultWidth: 40,
                    defaultTop: -60,
                    defaultLeft: -60,
                    opacity: 0.01,
                    showTaskbarIcon: false
                });
            }
        });
    }
}

async function standardFramePreload() {
    console.log('Standard Frame Preload');

    fin.Window.getCurrentSync().updateOptions({ contextMenu: true});
    fin.Window.getCurrentSync().show();

    await fin.InterApplicationBus.subscribe({ uuid: '*'}, 'fdc3-channel-changed', evt => {
        console.dir('got channel change', evt);
        let channelEvent = new CustomEvent('fdc3-channel-changed', { detail: evt } );
        document.body.dispatchEvent(channelEvent);
    });

    console.log('subscribed');
}

async function fdc3ProxyWindowPreload() {
    console.log('FDC3 Proxy Window Preload');

    let viewName = currentWindow.identity.name.split('/')[1];
    
    let view = fin.View.wrapSync({
        uuid: currentWindow.identity.uuid,
        name: viewName
    });

    view.on('destroyed', () => currentWindow.close());

    let fdc3Loader = document.createElement('script');
    fdc3Loader.setAttribute('src', 'https://cdn.openfin.co/services/openfin/fdc3/0.2.0/openfin-fdc3.js');
    
    let fdc3LoadPromise = new Promise(rs => {
        fdc3Loader.addEventListener('load', rs);
    });

    document.head.append(fdc3Loader);
    await fdc3LoadPromise;

    let fdc3ProxyChannel = await fin.InterApplicationBus.Channel.create(viewName);

    fdc3ProxyChannel.register('setTitle', title => {
        document.title = title;
    });
    
    fdc3ProxyChannel.register('broadcast', ctx => {
        console.log('fdc3 broadcasting');
        ctx.id = { ticker: ctx.instrumentCode };
        fdc3.broadcast(ctx);
    });

    fdc3ProxyChannel.register('raiseIntent', ([intent, ctx]) => {
        console.log('Intent raised: ', intent);
        console.dir(ctx);

        switch(intent) {
            case 'ViewContact':
                viewContact(ctx);
                break;
            case 'StartCall':
                startCall(ctx);
                break;
        }
    });

    fdc3.addContextListener(ctx => {
        console.log('fdc3 context listener', ctx, fdc3ProxyChannel);
        if(fdc3ProxyChannel.connections.length > 0) {
            fdc3ProxyChannel.dispatch(
                fdc3ProxyChannel.connections[0],
                'context-changed',
                ctx);
        }
    });

    fdc3.addEventListener('channel-changed', evt => {
        console.log('fdc3 channel changed');
        if(fdc3ProxyChannel.connections.length > 0 && evt.identity.name === currentWindow.identity.name) {
            fdc3ProxyChannel.dispatch(
                fdc3ProxyChannel.connections[0],
                'channel-changed',
                evt);
            fin.InterApplicationBus.publish('fdc3-channel-changed', evt);   
        }
    });

    console.log('FDC3 Proxy Configured');

    async function viewContact(ctx) {
        const contactIds = {
            'Ismael Dynes': '0033000000VxPE8AAN',
            'William Atkinson': '0033000000VxPcXAAV',
            'Nolan Vanbeek': '0033000000VxPDbAAN',
            'Alma Heath': '0033000000MS61xAAD'
        };
        
        let name = ctx.name || 'Ismael Dynes';
        let contactId = contactIds[name] || '0033000000VxPE8AAN';

        console.log('creating window', currentWindow);
        // height: 675, width: 565
        await fin.Window.create({
            name: name,
            url: 'https://login.salesforce.com/?un=demo.admin@tier1crm.com&pw=Acedemo123&startURL=/apex/T1C_Base__ACECoreWrapper?path=ACE.CoreWrappers.SummaryCoreWrapper%26Id=' + contactId,
            defaultHeight: 675,
            defaultWidth: 565,
            defaultCentered: true,
            waitForPageLoad: false,
            customData: {
                parentWindowName: currentWindow.identity.name
            }
        });
    }

    async function startCall(ctx) {
        let name = ctx.name;

        if((await fin.System.getAllApplications()).some(exApp => exApp.uuid === 'cloud9-crm-uuid')) {
            fin.InterApplicationBus.publish('CRMTOPBXDIAL-EX', {
                data: '2026696134'
            });
        }
        else {
            await fin.Window.create({
                name: 'Calling ' + name,
                url: 'https://fastfin.com/call/?name=' + name,
                defaultWidth: 325,
                defaultHeight: 200
            });
        }
    }
}

async function frameContentPreload() {
    console.log('Frame Content Preload');

    let win = await fin.View.getCurrentSync().getCurrentWindow();
    await win.show();

    let launchPadChannelWindow = fin.Window.wrapSync({uuid: 'osLaunchpadMain', name: 'osLaunchpadChannels'});
    let fdc3ProxyWindow = fin.Window.wrapSync({
        uuid: win.identity.uuid,
        name: 'fdc3/' + fin.me.name
    });

    launchPadChannelWindow.on('shown', window._fdc3Show = () => {
        console.log('Channel Picker Shown');
        fdc3ProxyWindow.show();
        fdc3ProxyWindow.setBounds({
            top: window.screenTop + 64,
            left: window.screenLeft + 5,
            height: window.innerHeight,
            width: window.innerWidth
        });
    });

    launchPadChannelWindow.on('hidden', window._fdc3Hide = () => {
        console.log('Channel Picker Hidden');
        fdc3ProxyWindow.hide();
    });

    window._fdc3Debug = () => {
        fdc3ProxyWindow.showDeveloperTools();
        fin.Window.wrapSync({uuid:'fdc3-service',name:'fdc3-service'}).showDeveloperTools();
    };

    let fdc3ProxyChannel = await fin.InterApplicationBus.Channel.connect(fin.me.name);
    console.dir(fdc3ProxyChannel);
    console.log(fdc3ProxyChannel.providerIdentity);

    window._fdc3 = {
        broadcast: function(ctx) {
            fdc3ProxyChannel.dispatch('broadcast', ctx);
        },
        addContextListener: function(listener){
            console.log('addContextListener');
            contextListeners.push(listener);
        },
        raiseIntent: function(intent, ctx) {
            fdc3ProxyChannel.dispatch('raiseIntent', [intent, ctx]);
        }
    }

    fdc3ProxyChannel.register('context-changed', ctx => {
        console.log('context-changed', contextListeners);
        contextListeners.forEach(listener => {
            listener(ctx);
        });
    });
}

async function contactDetailPreload() {
    console.log('Contact Detail Preload');

    let info = await currentWindow.getOptions();
    console.log('options: ', info)

    let { parentWindowName } = info.customData;

    let fdc3ChannelName = parentWindowName.split('/')[1];
    let fdc3ProxyChannel = await fin.InterApplicationBus.Channel.connect(fdc3ChannelName);

    console.log('Connected to FDC3 mock');

    let phoneNumberEl;
    
    while(!phoneNumberEl) {
        console.log('waiting for phone number...');
        await new Promise(rs => setTimeout(rs, 1000));
        phoneNumberEl = document.getElementById('Phone:ContactlabelEditContainer');
    }

    phoneNumberEl.addEventListener('click', evt => {
        console.log('Rasing Intent StartCall');
        fdc3ProxyChannel.dispatch('raiseIntent', ['StartCall', { type: 'fdc3.contact', name }]);

        evt.stopPropagation();
        evt.preventDefault();
    });
}

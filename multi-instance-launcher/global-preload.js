const currentApp = window.fin.Application.getCurrentSync();
const currentWindow = fin.me.isWindow ? window.fin.Window.getCurrentSync() : undefined;

//HACK: this belongs in the frameContentPreload
//      but is used before the load operation completes
//      so must be defined earlier
const contextListeners = [];
window._fdc3 = {
    addContextListener: function(listener) {
        contextListeners.push(listener);
    }
};

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

    console.dir(GoldenLayout);
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
        console.log('fdc3 context listener');
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

        // height: 675, width: 565
        await fin.Window.create({
            name: name,
            url: 'https://login.salesforce.com/?un=demo.admin@tier1crm.com&pw=Acedemo123&startURL=/apex/T1C_Base__ACECoreWrapper?path=ACE.CoreWrappers.SummaryCoreWrapper%26Id=' + contactId,
            defaultHeight: 675,
            defaultWidth: 565,
            defaultCentered: true,
            waitForPageLoad: false
        });
    }

    async function startCall(ctx) {
        let name = ctx.name;

        await fin.Window.create({
            name: 'Calling ' + name,
            url: 'http://ec2-34-229-228-38.compute-1.amazonaws.com/call/?name=' + name,
            defaultWidth: 325,
            defaultHeight: 200
        });
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

    launchPadChannelWindow.on('shown', () => {
        console.log('Channel Picker Shown');
        fdc3ProxyWindow.show();
        fdc3ProxyWindow.setBounds({
            top: window.screenTop + 64,
            left: window.screenLeft + 5,
            height: window.innerHeight,
            width: window.innerWidth
        });
    });

    launchPadChannelWindow.on('hidden', () => {
        console.log('Channel Picker Hidden');
        fdc3ProxyWindow.hide();
    });

    let fdc3ProxyChannel = await fin.InterApplicationBus.Channel.connect(fin.me.name);

    window._fdc3 = {
        broadcast: function(ctx) {
            fdc3ProxyChannel.dispatch('broadcast', ctx);
        },
        addContextListener: function(listener){
            contextListeners.push(listener);
        },
        raiseIntent: function(intent, ctx) {
            fdc3ProxyChannel.dispatch('raiseIntent', [intent, ctx]);
        }
    }

    fdc3ProxyChannel.register('context-changed', ctx => {
        contextListeners.forEach(listener => {
            listener(ctx);
        });
    });

    fdc3ProxyChannel.register('channel-changed', evt => {
        const styles = {
            red: 'solid 6px #df5353',
            orange: 'solid 6px #fb8772',
            yellow: 'solid 6px #ffdf92',
            green: 'solid 6px #7bd5c1',
            blue: 'solid 6px #5c78ff',
            purple: 'solid 6px #c686e5'
        }

        let style = styles[evt.channel.id];

        if(style) {
            document.body.style.borderLeft = style;
        }
        else {
            document.body.style.borderLeft = null;
        }
    });
}

async function contactDetailPreload() {
    console.log('Contact Detail Preload');

    let info = await fin.Frame.getCurrentSync().getInfo();
    let name = info.name;
    let parentWindowName = info.parent.name;

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

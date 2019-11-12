const currentApp = window.fin.Application.getCurrentSync();
const currentWindow = window.fin.Window.getCurrentSync();

window.addEventListener('load', () => {
    if (location.protocol === 'file:' && location.href.includes('standard-frame-provider')) {
        standardFrameProviderPreload();
    }
    else if (location.protocol === 'file:' && location.href.includes('standard-frame')) {
        standardFramePreload();
    }
    else {
        frameContentPreload();
    }
});

const winOpts = {
    'summary': {
        defaultHeight: 215,
        defaultWidth: 375
    },
    'blotter': {
        defaultHeight: 385,
        defaultWidth: 750
    },
    'chart': {
        defaultHeight: 515,
        defaultWidth: 750
    }
}

async function standardFrameProviderPreload() {
    console.log('Standard Frame Provider Preload');

    //TODO: Find out why this is necessary
    await new Promise(rs => setTimeout(rs, 1000));
    await createWindow();

    currentApp.addListener("run-requested", createWindow);

    //TODO: Remove this temporary workaround
    async function createWindow(evt) {
        console.log('createWindow');
        let app = (evt && evt.userAppConfigArgs && evt.userAppConfigArgs.app) || 'blotter';

        await fin.Window.create(Object.assign({
            name: fin.desktop.getUuid(),
            autoShow: true,
            url: `http://ec2-34-229-228-38.compute-1.amazonaws.com/${app}/`
        }, winOpts[app]));
    }

    async function createWindowTabbed(evt) {
        console.log('createWindow');
        let app = (evt && evt.userAppConfigArgs && evt.userAppConfigArgs.app) || 'blotter';

        let win = await fin.Layout.createWindow({
            name: window.fin.desktop.getUuid(),
            autoShow: false,
            layoutConfig: {
                content: [
                    {
                        type: "stack",
                        header: {},
                        isClosable: true,
                        reorderEnabled: true,
                        title: "",
                        activeItemIndex: 0,
                        width: 100,
                        height: 100,
                        content: [
                            {
                                type: "component",
                                componentName: "view",
                                componentState: {
                                    url: `http://ec2-34-229-228-38.compute-1.amazonaws.com/${app}/`,
                                    name: window.fin.desktop.getUuid()
                                },
                                isClosable: true,
                                reorderEnabled: true,
                                title: "view"
                            }
                        ]
                    }
                ]
            }
        });

        return win;
    }
}

async function standardFramePreload() {
    console.log('Standard Frame Preload');
}

async function frameContentPreload() {
    console.log('Frame Content Preload');

    let win = await fin.View.getCurrentSync().getCurrentWindow();
    await win.show();

}
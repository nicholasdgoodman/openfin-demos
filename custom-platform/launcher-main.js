import { WorkspaceManager }  from './workspace-manager.js';
import { SnapManager } from  './snap-manager.js';
import { GroupLayoutEngine } from './group-manager.js';
import { GroupLayoutResolver } from './collision-resolver.js';
import { LayoutToPlatform } from './layout-to-platform.js';

import settings from './settings.js';

console.log('launcher-main.js');

(async function() {

const finApp = fin.Application.getCurrentSync();
const finWindow = fin.Window.getCurrentSync();
const finPlatform = await window.getPlatform();

const workspaces = new WorkspaceManager();

const createAppButtons = document.querySelectorAll('.start-app-button');
const loadLayoutV1Button = document.querySelector('#load-layoutv1');
const workspaceSelect = document.querySelector('#workspace-select');
const closeLauncherButton = document.querySelector('#close-button');

const layoutV1 = localStorage.getItem("layoutv1-snapshot");

if(layoutV1 !== undefined && layoutV1 !== null) {
    loadLayoutV1Button.style.display = null;
}


loadLayoutV1Button.addEventListener('click', async ()=> {
  
        let snapshot = await LayoutToPlatform(JSON.parse(layoutV1));
        await finPlatform.applySnapshot({
            snapshot,
            options: { closeExistingWindows: true }
        });
});

createAppButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        let childWindow = await finPlatform.createWindow({
            url: 'widget-frame.html'
        });
        console.log('launched');

        let resolver = new GroupLayoutResolver();
        
        let layoutEngine = new GroupLayoutEngine({
            platformWindow: childWindow,
            //layoutResolver: resolver,
            log: console.log,
            windowResized: ({ source, group, change }) => 
                resolver.resolve(source, group, change)
        });

        await layoutEngine.init();
    });
});

closeLauncherButton.addEventListener('click', () => finApp.quit({ force: true }));

// Workspace Control:
workspaceSelect.addEventListener('change', async() => {
    workspaces.selectCurrentWorkspace(workspaceSelect.value);
    let snapshot = workspaces.getCurrentWorkspace();

    if(snapshot) {
        workspaceSelect.setAttribute('disabled', true);
        await finPlatform.applySnapshot({
            snapshot,
            options: { closeExistingWindows: true }
        });
        workspaceSelect.removeAttribute('disabled');
    }
});

workspaceSelect.dispatchEvent(new Event('change'));

finApp.on('window-end-user-bounds-changing', async () => {
    workspaces.setCurrentWorkspace(await finPlatform.getSnapshot());
});

finApp.on('window-options-changed', async() => {
    workspaces.setCurrentWorkspace(await finPlatform.getSnapshot());
});

// Window Grouping:

const minInt = -2147483648;
const previewWindowName = '@@preview';
const previewWindow = fin.Window.wrapSync({ uuid: fin.me.uuid, name: previewWindowName });

fin.Window.wrapSync(previewWindow.identity).close({ force: true });
fin.Window.create({
    name: previewWindowName,
    url: 'about:blank',
    autoShow: true,
    frame: false,
    opacity: 0.3,
    alwaysOnTop: true,
    saveWindowState: false,
    defaultTop: minInt,
    defaultLeft: minInt,
    showTaskbarIcon: false
});

let draggingWindow;

const snapping = new SnapManager({
    margin: settings.snapMargin,
    sensistivity: settings.snapSensistivity,
    inRange: (evt) => {
        previewWindow.setBounds(evt.position)
    },
    outOfRange: () => {
        previewWindow.setBounds({ top: minInt, left: minInt });
    },
    onDock: evt => { 
        previewWindow.setBounds({ top: minInt, left: minInt });
        draggingWindow.setBounds(evt.position);

        let { customData: { state }} = draggingWindow.options;
        let { customData: { groupId }} = evt.target;
        draggingWindow.updateOptions({ customData: { state, groupId }});

        let targetWindow = fin.Window.wrapSync({ uuid: fin.me.uuid, name: evt.target.name });
        draggingWindow.joinGroup(targetWindow);
    }
});

finApp.on('window-begin-user-bounds-changing', async (evt) => {
    let { uuid, name } = evt;
    let { windows } = await finPlatform.getSnapshot();

    let sourceWin = windows.find(win => win.name === name);
    let targetWins = windows.filter(win => win.name !== name && win.state === 'normal');

    if(sourceWin && targetWins.some(win => win.customData && win.customData.groupId === sourceWin.customData.groupId)) {
        return;
    }

    snapping.beginDrag(evt, targetWins);

    draggingWindow = Object.assign(
        fin.Window.wrapSync({ uuid, name }), { options: sourceWin }
    );
});

setInterval(async() => {
    if(draggingWindow) {
        let bounds = await draggingWindow.getBounds();
        snapping.drag(bounds);
    }
}, settings.snapPeriod);

finApp.on('window-end-user-bounds-changing', evt => {
    if(draggingWindow) {
        snapping.endDrag(evt);
        draggingWindow = undefined;
    }
});

// Uncomment to make window go semi-transparent on blur:
// finWindow.on('blurred', () => finWindow.updateOptions({ opacity: 0.7 }));
// finWindow.on('focused', () => finWindow.updateOptions({ opacity: 1.0 }));

})();
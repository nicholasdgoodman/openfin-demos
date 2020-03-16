import { WorkspaceManager }  from './workspace-manager.js';
import { SnapManager } from  './snap-manager.js';

console.log('launcher-main.js');

(async function() {

const finApp = fin.Application.getCurrentSync();
const finWindow = fin.Window.getCurrentSync();
const finPlatform = await window.getPlatform();

finWindow.showDeveloperTools();

const workspaces = new WorkspaceManager();

const createAppButtons = document.querySelectorAll('.start-app-button');
const workspaceSelect = document.querySelector('#workspace-select');

createAppButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        let x = await finPlatform.createWindow({
            url: 'widget-frame.html'
        });
        console.log('launched');
    });
});

// Workspace Control:
workspaceSelect.addEventListener('change', async() => {
    workspaces.selectCurrentWorkspace(workspaceSelect.value);
    let snapshot = workspaces.getCurrentWorkspace();

    if(snapshot) {
        await finPlatform.applySnapshot({
            snapshot,
            options: { closeExistingWindows: true }
        });
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

const monitorPeriod = 250;
let monitorHandle;
let draggingWindow;

const snapping = new SnapManager({
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
    let targetWins = windows.filter(win => win.name !== name);

    if(targetWins.some(win => win.customData && win.customData.groupId === sourceWin.customData.groupId)) {
        return;
    }

    draggingWindow = Object.assign(
        fin.Window.wrapSync({ uuid, name }), { options: sourceWin }
    );

    snapping.beginDrag(evt, targetWins);

    monitorHandle = setInterval(async () => {
        snapping.drag(await draggingWindow.getBounds());
    }, monitorPeriod);
});

finApp.on('window-end-user-bounds-changing', evt => {
    if(monitorHandle !== undefined) {
        clearInterval(monitorHandle);
        snapping.endDrag(evt);
    }
    monitorHandle = undefined;
});


finWindow.on('blurred', () => finWindow.updateOptions({ opacity: 0.7 }));
finWindow.on('focused', () => finWindow.updateOptions({ opacity: 1.0 }));

})();
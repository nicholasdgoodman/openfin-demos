/** John Original
import { getPlatform } from './platform.js';

import { WorkspaceManager }  from './workspace-manager.js';
import { SnapManager } from  './snap-manager.js';
import { GroupManager } from './group-manager.js';
import { CollisionResolver } from './collision-resolver.js';
import { LayoutToPlatform } from './layout-to-platform.js';
import settings from './settings.js';
import { setLogger, getLogger } from './logging.js';

const logger = getLogger();
setLogger(console);

logger.log('launcher-main.js');

(async function() {

const finApp = fin.Application.getCurrentSync();
const finWindow = fin.Window.getCurrentSync();
const finPlatform = await getPlatform();

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
        logger.log('launched');

        let resolver = new CollisionResolver();
        
        let layoutEngine = new GroupManager({
            platformWindow: childWindow,
            log: logger.log,
            layoutChanged: ({ source, group, change }) => 
                resolver.resolve(source, group, change)
        });

        await layoutEngine.init();
    });
});

closeLauncherButton.addEventListener('click', () => finApp.quit({ force: true }));

// Workspace Control:
workspaceSelect.addEventListener('change', async() => {
    workspaceSelect.setAttribute('disabled', true);
    await workspaces.selectCurrentWorkspace(workspaceSelect.value);
    workspaceSelect.removeAttribute('disabled');
});

workspaceSelect.dispatchEvent(new Event('change'));

finApp.on('window-end-user-bounds-changing', async () => {
    workspaces.saveCurrentWorkspace();
});

finApp.on('window-options-changed', async() => {
    workspaces.saveCurrentWorkspace();
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

//let draggingWindow;

const snapping = new SnapManager({
    margin: settings.snapMargin,
    sensistivity: settings.snapSensistivity,
    inRange: (evt) => {
        previewWindow.setBounds(evt.position)
    },
    outOfRange: () => {
        previewWindow.setBounds({ top: minInt, left: minInt });
    },
    onSnap: async (evt) => { 
        let draggingWindow = fin.Window.wrapSync({
            uuid: evt.source.uuid,
            name: evt.source.name
        });

        let targetWindow = fin.Window.wrapSync({
            uuid: evt.target.uuid,
            name: evt.target.name
        });

        previewWindow.setBounds({ top: minInt, left: minInt });
        draggingWindow.setBounds(evt.position);

        let { customData: { state }} = await draggingWindow.getOptions();
        let { customData: { groupId }} = evt.target;
        
        draggingWindow.updateOptions({ customData: { state, groupId }});
        draggingWindow.joinGroup(targetWindow);
    }
});

finApp.on('window-begin-user-bounds-changing', async (evt) => {
    await snapping.beginDrag(evt);
});

finApp.on('window-end-user-bounds-changing', evt => {
    snapping.endDrag(evt)
});

// Uncomment to make window go semi-transparent on blur:
// finWindow.on('blurred', () => finWindow.updateOptions({ opacity: 0.7 }));
// finWindow.on('focused', () => finWindow.updateOptions({ opacity: 1.0 }));
Nicks version below 
**/
import { getPlatform } from './platform.js';

import { WorkspaceManager }  from './workspace-manager.js';
import { SnapManager } from  './snap-manager.js';
import { GroupManager } from './group-manager.js';
import { CollisionResolver } from './collision-resolver.js';

import settings from './settings.js';
import { setLogger, getLogger } from './logging.js';

const logger = getLogger();
setLogger(console);

logger.log('launcher-main.js');

(async function() {

const finApp = fin.Application.getCurrentSync();
const finWindow = fin.Window.getCurrentSync();
const finPlatform = await getPlatform();

const workspaces = new WorkspaceManager();

const createAppButtons = document.querySelectorAll('.start-app-button');
const workspaceSelect = document.querySelector('#workspace-select');
const closeLauncherButton = document.querySelector('#close-button');

createAppButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        let childWindow = await finPlatform.createWindow({
            url: 'widget-frame.html'
        });
        logger.log('launched');

        let resolver = new CollisionResolver();
        
        let layoutEngine = new GroupManager({
            platformWindow: childWindow,
            log: logger.log,
            layoutChanged: ({ source, group, change }) => 
                resolver.resolve(source, group, change)
        });

        await layoutEngine.init();
    });
});

closeLauncherButton.addEventListener('click', () => finApp.quit({ force: true }));

// Workspace Control:
workspaceSelect.addEventListener('change', async() => {
    workspaceSelect.setAttribute('disabled', true);
    await workspaces.selectCurrentWorkspace(workspaceSelect.value);
    workspaceSelect.removeAttribute('disabled');
});

workspaceSelect.dispatchEvent(new Event('change'));

// --- synthetic event:
fin.InterApplicationBus.subscribe({ uuid: finApp.identity.uuid }, 'window-end-user-bounds-changing', async () => {
    workspaces.saveCurrentWorkspace();
});

finApp.on('window-end-user-bounds-changing', async () => {
    workspaces.saveCurrentWorkspace();
});

finApp.on('window-options-changed', async() => {
    workspaces.saveCurrentWorkspace();
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

//let draggingWindow;

const snapping = new SnapManager({
    margin: settings.snapMargin,
    sensistivity: settings.snapSensistivity,
    inRange: (evt) => {
        previewWindow.setBounds(evt.position);
        previewWindow.setBounds(evt.position);
    },
    outOfRange: () => {
        previewWindow.setBounds({ top: minInt, left: minInt });
    },
    onSnap: async (evt) => { 
        let draggingWindow = fin.Window.wrapSync({
            uuid: evt.source.uuid,
            name: evt.source.name
        });

        let targetWindow = fin.Window.wrapSync({
            uuid: evt.target.uuid,
            name: evt.target.name
        });

        previewWindow.setBounds({ top: minInt, left: minInt });
        draggingWindow.setBounds(evt.position);

        let { customData: { state, edgeIds }} = await draggingWindow.getOptions();
        let { customData: { groupId, edgeIds: { top, left, bottom, right } }} = evt.target;

        switch(evt.type) {
            case 'left':
                Object.assign(edgeIds, { right: left, top, bottom });
                break;
            case 'top':
                Object.assign(edgeIds, { bottom: top, left, right });
                break;
            case 'right':
                Object.assign(edgeIds, { left: right, top, bottom });
                break;
            case 'bottom':
                Object.assign(edgeIds, { top: bottom, left, right });
                break;
        }

        draggingWindow.updateOptions({ customData: { state, groupId, edgeIds }});
    }
});

finApp.on('window-begin-user-bounds-changing', async (evt) => {
    await snapping.beginDrag(evt);
});

finApp.on('window-end-user-bounds-changing', evt => {
    snapping.endDrag(evt)
});

// --- synthetic event:
fin.InterApplicationBus.subscribe({ uuid: finApp.identity.uuid }, 'window-begin-user-bounds-changing', async (evt) => {
    await snapping.beginDrag(evt);
});
// --- synthetic event:
fin.InterApplicationBus.subscribe({ uuid: finApp.identity.uuid }, 'window-end-user-bounds-changing', evt => {
    snapping.endDrag(evt)
});

// Uncomment to make window go semi-transparent on blur:
// finWindow.on('blurred', () => finWindow.updateOptions({ opacity: 0.7 }));
// finWindow.on('focused', () => finWindow.updateOptions({ opacity: 1.0 }));

})();
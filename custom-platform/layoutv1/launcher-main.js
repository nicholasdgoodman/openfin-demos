import { WorkspaceManager } from './workspace-manager.js';
import { setLogger, getLogger } from '../logging.js';

const logger = getLogger();
setLogger(console);
logger.log('launcher-main.js');

(async function () {

    const finApp = fin.Application.getCurrentSync();

    const workspaces = new WorkspaceManager();

    const createAppButtons = document.querySelectorAll('.start-app-button');
    const workspaceSelect = document.querySelector('#workspace-select');
    const closeLauncherButton = document.querySelector('#close-button');
    const saveLayoutV1Button = document.querySelector('#save-layoutv1');

    saveLayoutV1Button.addEventListener('click', async () => {
        workspaces.saveCurrentWorkspace(true);
    });

    createAppButtons.forEach(btn => {
        btn.addEventListener('click', async () => {

            await fin.Window.create({
                url: 'http://localhost:5001/layoutv1/widget-frame.html',
                name: fin.desktop.getUuid().substr(0, 7),
                frame: false,
                defaultHeight: 200,
                defaultWidth: 200,
                contextMenu: true,
                customData: {
                    groupId: fin.desktop.getUuid().substr(0, 7),
                    canSnap: true,
                    state: {}
                }
            });
            logger.log('launched');
        });
    });

    closeLauncherButton.addEventListener('click', () => finApp.quit({ force: true }));

    // Workspace Control:
    workspaceSelect.addEventListener('change', async () => {
        workspaceSelect.setAttribute('disabled', true);
        await workspaces.selectCurrentWorkspace(workspaceSelect.value);
        workspaceSelect.removeAttribute('disabled');
    });

    workspaceSelect.dispatchEvent(new Event('change'));

    finApp.on('window-end-user-bounds-changing', async () => {
        workspaces.saveCurrentWorkspace();
    });

    finApp.on('window-options-changed', async () => {
        workspaces.saveCurrentWorkspace();
    });


    window.layouts.workspaces.setRestoreHandler(window.layouts.restoreHelpers.standardRestoreHandler);

    window.layouts.workspaces.setGenerateHandler(() => {
        return {};
    });
    window.layouts.workspaces.ready();


})();
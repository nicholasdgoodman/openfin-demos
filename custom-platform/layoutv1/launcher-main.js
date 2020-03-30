import { WorkspaceManager } from '../workspace-manager.js';

console.log('launcher-main.js');

(async function () {

    const finApp = fin.Application.getCurrentSync();

    const workspaces = new WorkspaceManager();

    const createAppButtons = document.querySelectorAll('.start-app-button');
    const workspaceSelect = document.querySelector('#workspace-select');
    const closeLauncherButton = document.querySelector('#close-button');
    const saveLayoutV1Button = document.querySelector('#save-layoutv1');

    saveLayoutV1Button.addEventListener('click', async () => {
        let snapshot = await window.layouts.workspaces.generate();
        localStorage.setItem('layoutv1-snapshot', JSON.stringify(snapshot));
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
            console.log('launched');
        });
    });

    closeLauncherButton.addEventListener('click', () => finApp.quit({ force: true }));

    // Workspace Control:
    workspaceSelect.addEventListener('change', async () => {
        workspaces.selectCurrentWorkspace(workspaceSelect.value);
        let snapshot = workspaces.getCurrentWorkspace();

        if (snapshot) {
            workspaceSelect.setAttribute('disabled', true);
            await window.layouts.workspaces.restore(snapshot);
            workspaceSelect.removeAttribute('disabled');
        }
    });

    workspaceSelect.dispatchEvent(new Event('change'));

    const setCurrentWorkspace = async () => {
        let snapshot = await window.layouts.workspaces.generate();
        workspaces.setCurrentWorkspace(snapshot);
    };

    finApp.on('window-end-user-bounds-changing', setCurrentWorkspace);

    finApp.on('window-options-changed', setCurrentWorkspace);


    window.layouts.workspaces.setRestoreHandler(window.layouts.restoreHelpers.standardRestoreHandler);

    window.layouts.workspaces.setGenerateHandler(() => {
        return {};
    });
    window.layouts.workspaces.ready();


})();
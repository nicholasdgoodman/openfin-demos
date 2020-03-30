import { getPlatform } from './platform.js';

export class WorkspaceManager {
    constructor() {
        this.workspaces = {};
        this.currentWorkspace = '';
     }

    set(name, workspace) {
        this.workspaces[name] = workspace;
    }

    get(name) {
        return this.workspaces[name];
    }

    async selectCurrentWorkspace(name) {
        this.currentWorkspace = name;

        let snapshot = this.getCurrentWorkspace();
        if(snapshot) {
            let platform = await getPlatform();
            await platform.applySnapshot({
                snapshot,
                options: { closeExistingWindows: true }
            });
        }
    }

    setCurrentWorkspace(workspace) {
        this.set(this.currentWorkspace, workspace);
    }

    async saveCurrentWorkspace() {
        let platform = await getPlatform();
        let snapshot = await platform.getSnapshot();
        this.setCurrentWorkspace(snapshot);
    }

    getCurrentWorkspace() {
        return this.get(this.currentWorkspace);
    }
}
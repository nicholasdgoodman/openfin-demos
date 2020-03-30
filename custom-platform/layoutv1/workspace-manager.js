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
        if (snapshot) {
            await window.layouts.workspaces.restore(snapshot);
        }
    }

    setCurrentWorkspace(workspace) {
        this.set(this.currentWorkspace, workspace);
    }

    async saveCurrentWorkspace(toLocalStorage = false) {
        if(toLocalStorage) {
            let snapshot = await window.layouts.workspaces.generate();
            localStorage.setItem('layoutv1-snapshot', JSON.stringify(snapshot));
        } else {
            let snapshot = await window.layouts.workspaces.generate();
            this.setCurrentWorkspace(snapshot);
        }
    }

    getCurrentWorkspace() {
        return this.get(this.currentWorkspace);
    }
}
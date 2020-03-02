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

    selectCurrentWorkspace(name) {
        this.currentWorkspace = name;
    }

    setCurrentWorkspace(workspace) {
        this.set(this.currentWorkspace, workspace);
    }

    getCurrentWorkspace() {
        return this.get(this.currentWorkspace);
    }
}
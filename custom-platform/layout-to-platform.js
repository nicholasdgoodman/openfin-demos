export async function LayoutToPlatform(layout) {
    const finPlatform = await window.getPlatform();
    let newSnapshot = await finPlatform.getSnapshot();
    
    let uuid = newSnapshot.windows[0].uuid;
    let appMatchUUID = 'openfin-sample-layout-dsifuou'; // this would not be a hardcoded string this would be the uuid value captured above but in this demo they are two different apps.
    const currentApp = layout.apps.find(app => app.uuid === appMatchUUID); // this would not be a hardcoded string this would be the uuid value captured above but in this demo they are two different apps.
    const groupMatch = {};
    const getCustomData = (name, windowGroup, customData) => {

        let groupId = groupMatch[name];
        let newCustomData = Object.assign({
            groupId: groupId ?? fin.desktop.getUuid().substr(0,7),
            isInGroup: false,
            canSnap: true,
            state: {}
        }, customData);

        newCustomData.isInGroup = windowGroup !== undefined && windowGroup.length > 0;

        if(!newCustomData.isInGroup) {
            // not grouped
            return newCustomData;
        }

        if(groupId == undefined) {
            // this is the first window for a group
            groupId = newCustomData.groupId;
            groupMatch[name] = groupId;
            windowGroup.forEach(groupedWindow => {
                groupMatch[groupedWindow.name] = groupId;
            });
        }
        return newCustomData;
    };

    if(currentApp === undefined) {
        throw new Error("Expected app not available. Please ensure that the layoutv1 app.config hasn't changed it's uuid.");
    }

    currentApp.childWindows.forEach(childWin => {
        let newChildWin = {};
        newChildWin.name = childWin.name;
        newChildWin.url = childWin.url.replace('layoutv1/', ''); // only needed for this demo as we have two different apps. In a real world situation it would be an upgraded app with the same url
        newChildWin.state = childWin.state;
        newChildWin.uuid = uuid;
        newChildWin.frame = childWin.frame;
        newChildWin.height = childWin.bounds.height;
        newChildWin.defaultHeight = childWin.bounds.height;
        newChildWin.width = childWin.bounds.width;
        newChildWin.defaultWidth = childWin.bounds.width;
        newChildWin.defaultLeft = childWin.bounds.left;
        newChildWin.left = childWin.bounds.left;
        newChildWin.top = childWin.bounds.top;
        newChildWin.defaultTop = childWin.bounds.top;
        newChildWin.customData = getCustomData(childWin.name, childWin.windowGroup, childWin.customData);

        newSnapshot.windows.push(newChildWin);
    });

    return newSnapshot;
}
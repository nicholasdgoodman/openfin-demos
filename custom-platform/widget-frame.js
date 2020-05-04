(async function () {

const finWindow = fin.Window.getCurrentSync();

const groupIdInput = document.querySelector('#groupIdInput');
const changeGroupId = document.querySelector('#changeGroupId');
const textInput = document.querySelector('#textInput');
const ladder = document.querySelector('#ladder');

const dragRegions = document.querySelectorAll('.drag');
const resizeBorders = document.querySelectorAll('.resize-border');
const resizeCorners = document.querySelectorAll('.resize-corner');

let { customData } = await finWindow.getOptions();

groupIdInput.innerText = customData.groupId
textInput.value = customData.state.textInput || '';

function setState(key, value) {    
    finWindow.updateOptions({ 
        customData: {
            ...customData,
            state: {
                ...customData.state,
                [key]: value
            }
        }
    });
}

function setGroup(groupId, edgeIds) {
    finWindow.updateOptions({
        customData: {
            ...customData,
            groupId,
            edgeIds
        }
    });
}

finWindow.addListener('options-changed', evt => {
    let { customData: { state, groupId, edgeIds, isInGroup } } = evt.options;

    groupIdInput.innerText = groupId;
    textInput.value = state.textInput || '';
});

textInput.addEventListener('input', evt => setState(textInput.id, textInput.value));
changeGroupId.addEventListener('click', () => {
    let newGroupId = fin.desktop.getUuid().substr(0, 7);
    let newEdgeIds = {
        top: fin.desktop.getUuid().substr(0, 7),
        left: fin.desktop.getUuid().substr(0, 7),
        bottom: fin.desktop.getUuid().substr(0, 7),
        right: fin.desktop.getUuid().substr(0, 7)
    }
    //groupIdInput.innerText = newGroupId;
    window.moveBy(10,10);
    setGroup(newGroupId, newEdgeIds);
});

const resizeOptions = {
    moveIndependently: true
};

let ladderExpanded = customData.state && customData.state.ladderExpanded || false;

ladder.onclick = async () => {
    ladderExpanded = !ladderExpanded;
    let width = 0;
    let height = ladderExpanded ? 200 : -200;
    await finWindow.resizeBy(width, height, "top-left", resizeOptions);
    setState("ladderExpanded", ladderExpanded);
};

dragRegions.forEach(dragRegion => {
    let isDragging = false;
    function onBeginDrag() {
        fin.InterApplicationBus.publish('window-begin-user-bounds-changing', {
            left: window.screenLeft,
            top: window.screenTop,
            height: window.outerHeight,
            width: window.outerWidth,
            reason: 'synthetic-move',
            uuid: fin.me.identity.uuid,
            name: fin.me.identity.name
        });
        isDragging = true;
    }

    function onEndDrag() {
        fin.InterApplicationBus.publish('window-end-user-bounds-changing', {
            left: window.screenLeft,
            top: window.screenTop,
            height: window.outerHeight,
            width: window.outerWidth,
            reason: 'synthetic-move',
            uuid: fin.me.identity.uuid,
            name: fin.me.identity.name
        });
        isDragging = false;
    }

    dragRegion.addEventListener('mousedown', evt => { 
        onBeginDrag();
        evt.stopPropagation();
        evt.preventDefault();
    });

    dragRegion.addEventListener('mouseup', evt => {
        if(isDragging) {
            onEndDrag();
        }
    });

    dragRegion.addEventListener('mouseenter', evt => {
        if(isDragging && evt.which === 0) {
            onEndDrag();
        }
    });
});

resizeBorders.forEach(resizeBorder => {
    let isResizing = false;

    function onBeginResize(edges) {
        fin.InterApplicationBus.publish('window-begin-user-bounds-changing', {
            left: window.screenLeft,
            top: window.screenTop,
            height: window.outerHeight,
            width: window.outerWidth,
            reason: 'synthetic-resize',
            edges,
            uuid: fin.me.identity.uuid,
            name: fin.me.identity.name
        });
        isResizing = true;
    }

    function onEndResize() {
        console.log('onEndResize');
        fin.InterApplicationBus.publish('window-end-user-bounds-changing', {
            left: window.screenLeft,
            top: window.screenTop,
            height: window.outerHeight,
            width: window.outerWidth,
            reason: 'synthetic-resize',
            uuid: fin.me.identity.uuid,
            name: fin.me.identity.name
        });
        isResizing = false;
    }

    resizeBorder.addEventListener('mousedown', evt => {
        let edges = [];
        
        ['top','left','bottom','right'].forEach(edge => {
            if(evt.target.classList.contains(`resize-border-${edge}`)) {
                edges.push(edge);
            }
        });
        
        onBeginResize(edges);
        evt.stopPropagation();
        evt.preventDefault();
    });

    resizeBorder.addEventListener('mouseup', evt => {
        if(isResizing) {
            onEndResize();
        }
    });

    resizeBorder.addEventListener('mouseenter', evt => {
        if(isResizing && evt.which === 0) {
            onEndResize();
        }
    });
});

window.opener && window.opener.addEventListener('beforeunload', () => finWindow.close());

})();
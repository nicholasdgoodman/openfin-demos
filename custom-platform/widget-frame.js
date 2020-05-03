(async function () {

const groupIdInput = document.querySelector('#groupIdInput');
const changeGroupId = document.querySelector('#changeGroupId');
const textInput = document.querySelector('#textInput');
const finWindow = fin.Window.getCurrentSync();
const ladder = document.querySelector('#ladder');

const dragRegions = document.querySelectorAll('.drag');

let { customData: { state, groupId } } = await finWindow.getOptions();

groupIdInput.innerText = groupId
textInput.value = state.textInput || '';


function setState(key, value) {
    state[key] = value;
    finWindow.updateOptions({ customData: { state, groupId } });
}

function setGroup(groupId) {
    finWindow.updateOptions({ customData: { state, groupId } });
}

finWindow.addListener('options-changed', evt => {
    let { customData: { state, groupId, isInGroup } } = evt.options;

    groupIdInput.innerText = groupId;
    textInput.value = state.textInput || '';
});

textInput.addEventListener('input', evt => setState(textInput.id, textInput.value));
changeGroupId.addEventListener('click', () => {
    let newGroupId = fin.desktop.getUuid().substr(0, 7);
    groupIdInput.innerText = newGroupId;
    setGroup(newGroupId);

    finWindow.leaveGroup();
});

const resizeOptions = {
    moveIndependently: true
};
let ladderExpanded = false;

if(state !== undefined && state.ladderExpanded !== undefined) {
    ladderExpanded = state.ladderExpanded;
}

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
            reason: 'synthetic',
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

window.opener && window.opener.addEventListener('beforeunload', () => finWindow.close());

})();
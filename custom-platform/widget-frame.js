(async function () {

const groupIdInput = document.querySelector('#groupIdInput');
const groupIdClear = document.querySelector('#groupIdClear');
const textInput = document.querySelector('#textInput');
const finWindow = fin.Window.getCurrentSync();
const ladder = document.querySelector('#ladder');

let { customData: { state, groupId, isInGroup } } = await finWindow.getOptions();

groupIdClear.style.display = isInGroup ? "inline" : null;

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
    groupIdClear.style.display = isInGroup ? "inline" : null;
});

textInput.addEventListener('input', evt => setState(textInput.id, textInput.value));
groupIdClear.addEventListener('click', () => {
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

window.opener && window.opener.addEventListener('beforeunload', () => finWindow.close());

})();
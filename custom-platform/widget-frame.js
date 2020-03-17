import { GroupLayoutResolver } from './group-layout-resolver.js';
import { GroupLayoutEngine } from './group-layout-engine.js';

(async function () {

const groupIdInput = document.querySelector('#groupIdInput');
const groupIdClear = document.querySelector('#groupIdClear');
const textInput = document.querySelector('#textInput');
const finWindow = fin.Window.getCurrentSync();
const ladder = document.querySelector('#ladder');

let { customData: { state, groupId } } = await finWindow.getOptions();

groupIdInput.innerText = groupId
textInput.value = state.textInput || '';

/*
// teams can swap in their own layout resolver or group layout engine by switching
// out the js files or replacing this script and constructing it themselves
const resolver = new GroupLayoutResolver();
const layoutEngine = new GroupLayoutEngine(
    finWindow,
    resolver,
    console.log
);
await layoutEngine.init(isGrouped => {
    if (isGrouped) {
        groupIdClear.style.display = "inline";
    } else {
        groupIdClear.style.display = null;
    }
});
*/

function setState(key, value) {
    state[key] = value;
    finWindow.updateOptions({ customData: { state, groupId } });
}

function setGroup(groupId) {
    finWindow.updateOptions({ customData: { state, groupId } });
}

finWindow.addListener('options-changed', evt => {
    let { customData: { state, groupId } } = evt.options;

    groupIdInput.innerText = groupId;
    textInput.value = state.textInput || '';
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
(async function () {

const groupIdInput = document.querySelector('#groupIdInput');
const groupIdClear = document.querySelector('#groupIdClear');
const textInput = document.querySelector('#textInput');
const finWindow = fin.Window.getCurrentSync();
const ladder = document.querySelector('#ladder');

let { customData: { state, groupId } } = await finWindow.getOptions();

groupIdInput.innerText = groupId
textInput.value = state.textInput || '';


function setState(key, value) {
    state[key] = value;
    finWindow.updateOptions({ customData: { state, groupId } });
}

window.layouts.snapAndDock.addEventListener('window-undocked', async (event) => {
    console.log("Undocked from another window");
    finWindow.updateOptions({ customData: { isInGroup: false } });

});

window.layouts.snapAndDock.addEventListener('window-docked', async (event) => {
    console.log("docked to another window");
    finWindow.updateOptions({ customData: { isInGroup: true } });
});

finWindow.addListener('options-changed', evt => {
    let { customData: { state, isInGroup } } = evt.options;

    textInput.value = state.textInput || '';
    groupIdClear.style.display = isInGroup ? "inline" : null;
});

textInput.addEventListener('input', evt => setState(textInput.id, textInput.value));

groupIdClear.addEventListener('click', () => {
    window.layouts.snapAndDock.undockWindow(finWindow.me);
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
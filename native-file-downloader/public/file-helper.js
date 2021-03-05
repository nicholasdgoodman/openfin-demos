
let fileHelper;
let isInitialised = false;

let errorList = {
    "ERR:NOFILENAME": "Error: no filename was provided when calling the file helper.",
    "ERR:INVALIDEXT": "Error: invalid file extension used in filename.",
    "ERR:NODATA": "Error: no data was passed when trying to save a file.",
    "ERR:CONVERTDATA": "Error: unable to convert the passed data into a byte array from base64 for saving to file.",
    "ERR:SAVEFILE": "Error: unable to save file",
    "ERR:NOFILEID": "Error: a file id was not passed.",
    "ERR:NOFILEIDFOUND": "Error: the file helper does not have a record of that file id.",
    "ERR:OPENFILE": "Error: unable to open file"
};

let success = "SUCCESS";

function getChannelId() {
    let id = fin.me.identity.uuid;
    return id.toLowerCase();
}

async function getFileHelper(){
    if(fileHelper !== undefined) {
        return fileHelper;
    }

    let channelId = getChannelId();
    try {
        fileHelper = await fin.InterApplicationBus.Channel.connect(channelId, { wait: false });
    } catch (err) {
        // the connection is not up so assume the helper is not running.
        // try and launch
        await launchHelper();
    }

    if(fileHelper === undefined) {
        fileHelper = await fin.InterApplicationBus.Channel.connect(channelId);
    }

    return fileHelper;
}

async function launchHelper(){
    try {
        await fin.System.launchExternalProcess({ alias: 'native-helper', 
        target: 'native-helper.exe',
        lifetime: "application",
        listener: (result) => {
            console.log('the exit code for the native helper is:', result.exitCode);
        },
        arguments: '-i ' + getChannelId() });
    } catch (err) {
        console.error("There has been an error launching the native helper", err);
    }
}

export async function init() {
    if(isInitialised) {
        return;
    }

    // we are just trying to do an early fetch of the helper so that it isn't fetched the first
    // time someone tries to save a file (although that is also an option so that the helper is lazy loaded).
    await getFileHelper();
    isInitialised = true;
}

export function isError(returnedValue) {
    return errorList[returnedValue] !== undefined;
}

export function getErrorMessage(returnedValue) {
    return errorList[returnedValue];
}

export async function saveFile(fileName, data) {

    let helper = await getFileHelper();
    let fileId = await helper.dispatch('save-file', {
        fileName,
        content: data
    });

    return fileId;
}

export async function saveAndOpenFile(fileName, data) {

    let helper = await getFileHelper();
    let fileId = await helper.dispatch('save-file', {
        fileName,
        content: data
    });

    if(isError(fileId)){
        return fileId;
    }

    await helper.dispatch('open-file', { fileId });

    return success;
}

export async function openFile(fileId) {
    let helper = await getFileHelper();
    let result = await helper.dispatch('open-file', { fileId });
    return result;
}
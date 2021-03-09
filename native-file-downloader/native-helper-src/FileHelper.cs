using System;
using System.Collections.Generic;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using System.IO;
using System.Diagnostics;
using System.Configuration;
using System.Collections.Specialized;
using Newtonsoft.Json.Linq;
using Fin = Openfin.Desktop;
using log4net;

namespace NativeHelper
{
    public partial class FileHelper : Form
    {
        private readonly Fin.Runtime runtime;
        private readonly Guid DownloadsFolderId = Guid.Parse("{374DE290-123F-4565-9164-39C4925E467B}");
        private readonly string DownloadFolderPath;
        private static readonly ILog logger = LogManager.GetLogger(typeof(FileHelper));
        private readonly List<string> approvedFileExtensions = new List<string>();

        private readonly Dictionary<string, string> downloads = new Dictionary<string, string>();

        public FileHelper(String id)
        {
            logger.Debug("Initializing FileHelper");

            // Read all the keys from the config file
            NameValueCollection configuredFileTypes;
            configuredFileTypes = ConfigurationManager.AppSettings;

            foreach (string supportedExtension in configuredFileTypes.AllKeys)
            {
                try
                {
                    if (Convert.ToBoolean(configuredFileTypes.Get(supportedExtension)))
                    {
                        approvedFileExtensions.Add(supportedExtension);
                    }
                } catch (Exception parseError)
                {
                    logger.Error("Invalid value specified for supported file extension in App.config. Value must be True or False. Key: " + supportedExtension, parseError);
                }
            }

            if (id == null)
            {
                logger.Debug("No unique id passed to the filehelper to link to a specific application.");
            } else
            {
                logger.Debug("Unique id passed to the filehelper to link to a specific application: " + id);
            }

            InitializeComponent();

            logger.Debug("Fetching Download Folder Path.");
            
            try
            {
                IntPtr downloadFolderPathHandle;
                SHGetKnownFolderPath(DownloadsFolderId, 0, IntPtr.Zero, out downloadFolderPathHandle);

                DownloadFolderPath = Marshal.PtrToStringUni(downloadFolderPathHandle);
                Marshal.FreeCoTaskMem(downloadFolderPathHandle);
            }
            catch (Exception downloadsFolderError)
            {
                logger.Error("Unable to lookup Downloads Folder", downloadsFolderError);
                throw new Exception("Unable to lookup DownloadsFolder", downloadsFolderError);
            }

            logger.Debug("Fetched Download Folder Path: " + DownloadFolderPath);

            logger.Debug("Setting up file handling capability.");
            var openFileDialog = new OpenFileDialog();
            logger.Debug("File handling capability setup.");

            logger.Debug("Setting up OpenFin Runtime connection to runtime version 'stable'.");

            var opts = new Fin.RuntimeOptions()
            {
                Version = "stable",
                RuntimeConnectOptions = Fin.RuntimeConnectOptions.NonPersistent
            };

            runtime = Fin.Runtime.GetRuntimeInstance(opts);

            logger.Debug("OpenFin Runtime instance created. About to connect.");

            runtime.Connect(() =>
            {
                logger.Debug("OpenFin Runtime instance connected.");
                var defaultChannelId = "native-helper";
                var channelId = "";

                if (id != null && id.Trim().Length > 0) {
                    logger.Debug("Custom identity passed: " + id);
                    channelId = id.ToLower();
                }
                else
                {
                    logger.Debug("No Custom identity passed. Using default channel: " + defaultChannelId);
                    channelId = defaultChannelId;
                }
                
                try
                {
                    logger.Debug("Creating channel:" + channelId);
                    var provider = runtime.InterApplicationBus.Channel.CreateProvider(channelId);
                    logger.Debug("Channel:" + channelId + " created.");

                    provider.ClientConnected += (s, e) =>
                    {
                        logger.Debug("Client Request Received. Request to connect to channel: " + channelId + " from application with UUID: " + e.Client.RemoteEndpoint.Uuid);
                        if(channelId != defaultChannelId && channelId != e.Client.RemoteEndpoint.Uuid.ToLower())
                        {
                            logger.Error("Client UUID (" + e.Client.RemoteEndpoint.Uuid.ToLower() + ") Request  to connect to channel: " + channelId + " denied. Only the app that launches the helper can connect to it.");
                            throw new Exception("Only the application that created the helper can connect to it. UUID/Channel Mismatch.");
                        }
                        logger.Debug("Client Request to connect to channel: " + channelId + " from application with UUID: " + e.Client.RemoteEndpoint.Uuid.ToLower() + " successful.");
                    };

                    logger.Debug("Registering: save-file topic.");
                    provider.RegisterTopic<JObject, string>("save-file", (args) =>
                    {
                        var logPrefix = "save-file: ";
                        logger.Debug(logPrefix + "save-file: Called");
                        var fileId = Guid.NewGuid().ToString();
                        var fileName = args.Value<string>("fileName");

                        if (fileName == null || fileName.Length == 0)
                        {
                            logger.Error(logPrefix + "No filename was passed.");
                            return ErrorList.ERROR_NO_FILE_NAME;
                        }

                        if (isValidFileType(fileName))
                        {
                            logger.Debug(logPrefix + "Filename retrieved: " + fileName);
                            var content = args.Value<string>("content");
                            logger.Debug(logPrefix + "Content retrieved.");
                            
                            if (content == null || content.Length == 0)
                            {
                                logger.Error(logPrefix + "No data was passed.");
                                return ErrorList.ERROR_NO_DATA_PASSED;
                            }

                            var target = Path.Combine(DownloadFolderPath, fileName);
                            logger.Debug(logPrefix + "Looking to write to: " + target);
                            byte[] passedData;
                            try
                            {
                                logger.Debug(logPrefix + "About to convert passed data from Base64 string");
                                passedData = Convert.FromBase64String(content);
                            }
                            catch (Exception convertingDataError)
                            {
                                logger.Error(logPrefix + "Error converting passed data: ", convertingDataError);
                                return ErrorList.ERROR_CONVERTING_DATA;
                            }

                            try
                            {
                                logger.Debug(logPrefix + "About to write out content to target path: " + target);
                                File.WriteAllBytes(
                                    target,
                                    passedData);
                            }
                            catch (Exception fileSaveError)
                            {
                                logger.Error(logPrefix + "Error saving file: " + target, fileSaveError);
                                return ErrorList.ERROR_SAVING_FILE;
                            }

                            logger.Debug(logPrefix + "content written to file.");
                            downloads[fileId] = target;
                            logger.Debug(logPrefix + "Returning id: " + fileId);
                            return fileId;
                        } else
                        {
                            logger.Error("Invalid file extension. Please check app settings in the App.config to ensure the file extension you are trying to save is supported. Returning id: 'Error - Invalid Extension'");
                            return ErrorList.ERROR_INVALID_FILE_EXTENSION;
                        }
                    });
                    logger.Debug("save-file topic registered.");

                    logger.Debug("Registering: open-file topic.");
                    provider.RegisterTopic<JObject, string>("open-file", (args) =>
                    {
                        var logPrefix = "open-file: ";
                        logger.Debug(logPrefix + "Called");
                        var fileId = args.Value<string>("fileId");

                        if (fileId == null || fileId.Length == 0)
                        {
                            logger.Error(logPrefix + "No fileid was passed.");
                            return ErrorList.ERROR_NO_FILE_ID;
                        }

                        logger.Debug(logPrefix + "Passed file id: " + fileId);
                        if(downloads.ContainsKey(fileId))
                        {
                            string fileName = downloads[fileId];
                            logger.Debug(logPrefix + "file name retrieved: " + fileName);
                            try
                            {
                                logger.Debug(logPrefix + "Opening file: " + fileName);
                                Process.Start(fileName);
                            }
                            catch (Exception fileOpenError)
                            {
                                logger.Error(logPrefix + "Error opening file: " + fileName, fileOpenError);
                                return ErrorList.ERROR_OPENING_FILE;
                            }

                        }
                        else
                        {
                            return ErrorList.ERROR_NO_FILE_ID_FOUND;
                        }

                        return "SUCCESS";

                    });
                    logger.Debug("open-file topic registered.");
                    provider.OpenAsync();
                } 
                catch(Exception err)
                {
                    logger.Error("Error during create of channel or registration of topics.", err);
                    throw (new Exception("Unable to setup file helper channel", err));
                }

            });
        }

        private bool isValidFileType(string fileName)
        {
            logger.Debug("isValidFileType: Checking for valid file type for file name: " + fileName);
            bool isValid = false;

            fileName = fileName.ToLower();

            approvedFileExtensions.ForEach(entry =>
             {
                 if(fileName.IndexOf('.' + entry.ToLower()) > -1)
                 {
                     isValid = true;
                 }
             });

            logger.Debug("isValidFileType: Is " + fileName + " a valid file type? : " + isValid);
            
            return isValid;
        }

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            Hide();
        }

        [DllImport("Shell32.dll")]
        private static extern int SHGetKnownFolderPath(
            [MarshalAs(UnmanagedType.LPStruct)] Guid rfid, 
            uint dwFlags,
            IntPtr hToken,
            out IntPtr ppszPath);

    }
}

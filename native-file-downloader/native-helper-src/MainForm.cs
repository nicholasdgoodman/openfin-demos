using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using System.IO;
using System.Diagnostics;

using Newtonsoft.Json.Linq;

using Fin = Openfin.Desktop;

namespace native_helper_src
{
    public partial class MainForm : Form
    {
        private readonly Fin.Runtime runtime;
        private readonly Guid DownloadsFolderId = Guid.Parse("{374DE290-123F-4565-9164-39C4925E467B}");
        private readonly string DownloadFolderPath;

        private readonly Dictionary<string, string> downloads = new Dictionary<string, string>();

        public MainForm()
        {
            InitializeComponent();

            IntPtr downloadFolderPathHandle;
            SHGetKnownFolderPath(DownloadsFolderId, 0, IntPtr.Zero, out downloadFolderPathHandle);

            DownloadFolderPath = Marshal.PtrToStringUni(downloadFolderPathHandle);
            Marshal.FreeCoTaskMem(downloadFolderPathHandle);

            var openFileDialog = new OpenFileDialog();

            var opts = new Fin.RuntimeOptions()
            {
                Version = "stable",
                RuntimeConnectOptions = Fin.RuntimeConnectOptions.NonPersistent
            };

            runtime = Fin.Runtime.GetRuntimeInstance(opts);

            runtime.Connect(() =>
            {
                var provider = runtime.InterApplicationBus.Channel.CreateProvider("native-helper");

                provider.RegisterTopic<JObject, string>("save-file", (args) =>
                {
                    var fileId = Guid.NewGuid().ToString();

                    var fileName = args.Value<string>("fileName");
                    var content = args.Value<string>("content");

                    var target = Path.Combine(DownloadFolderPath, fileName);

                    File.WriteAllBytes(
                        target,
                        Convert.FromBase64String(content));

                    downloads[fileId] = target;

                    return fileId;
                });

                provider.RegisterTopic<JObject>("open-file", (args) =>
                {
                    var fileId = args.Value<string>("fileId");
                    var fileName = downloads[fileId];

                    Process.Start(fileName);
                });

                provider.OpenAsync();
            });
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

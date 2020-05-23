using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

using Fin = Openfin.Desktop;

namespace native_helper_src
{
    public partial class MainForm : Form
    {
        Fin.Runtime runtime;

        public MainForm()
        {
            InitializeComponent();

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

                provider.RegisterTopic("file-picker", () =>
                {
                    object result = null;
                    Invoke(new Action(() =>
                    {
                        var dialogResult = openFileDialog.ShowDialog();

                        if(dialogResult == DialogResult.OK)
                        {
                            result = new
                            {
                                fileName = openFileDialog.FileName,
                                filePath = openFileDialog.FileName,
                                fileData = Convert.ToBase64String(System.IO.File.ReadAllBytes(openFileDialog.FileName))
                            };
                        }
                    }));

                    return result;
                });

                provider.OpenAsync();
            });
        }

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            this.Hide();
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;

using Fin = Openfin.Desktop;
using Openfin.Desktop.Messaging;

namespace main_app
{
    /// <summary>
    /// Interaction logic for ChildWindow.xaml
    /// </summary>
    public partial class ChildWindow : Window
    {
        readonly Fin.Runtime fin;

        public ChildWindow()
        {
            InitializeComponent();

            fin = Fin.Runtime.GetRuntimeInstance(Fin.RuntimeOptions.LoadDefault());
            fin.Connected += OpenFin_Connected;
            fin.Connect(() => { });
        }

        private void OpenFin_Connected(object sender, EventArgs e)
        {
            var channel = fin.InterApplicationBus.Channel.CreateClient("message-channel");

            channel.RegisterTopic<string, string>("reverse-string", message =>
             {
                 UpdateMessage(message);
                 return new string(message.Reverse().ToArray());
             });

            channel.ConnectAsync();
        }

        private void UpdateMessage(string message)
        {
            Dispatcher.Invoke(() =>
            {
                messageTextBox.Text = message;
            });
        }
    }
}

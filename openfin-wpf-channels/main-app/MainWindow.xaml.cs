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
using System.Windows.Navigation;
using System.Windows.Shapes;
using System.Diagnostics;

using Fin = Openfin.Desktop;
using Openfin.Desktop.Messaging;

namespace main_app
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        readonly Fin.Runtime fin;
        int clientCount = 0;

        public MainWindow()
        {
            InitializeComponent();

            fin = Fin.Runtime.GetRuntimeInstance(Fin.RuntimeOptions.LoadDefault());
            fin.Connected += OpenFin_Connected;
            fin.Connect(() => { });
        }

        private void OpenFin_Connected(object sender, EventArgs e)
        {
            var channel = fin.InterApplicationBus.Channel.CreateProvider("message-channel");
            channel.ClientConnected += MessageChannel_ClientConnected;
            channel.OpenAsync();
        }

        private void MessageChannel_ClientConnected(object sender, ChannelConnectedEventArgs e)
        {
            AddClientToList(e.Client);
        }

        private void AddClientToList(ChannelClient client)
        {
            Dispatcher.Invoke(() =>
            {
                clientCount++;
                var clientName = $"Child App {clientCount}";
                connectedClients.Items.Add(new
                {
                    Name = clientName,
                    Client = client
                });
            });
        }

        private async void SendMessage_Click(object sender, RoutedEventArgs e)
        {
            var client = connectedClients.SelectedValue as ChannelClient;

            if(client == null)
            {
                return;
            }

            var response = await client.DispatchAsync<string>("reverse-string", messageTextBox.Text);
            UpdateResponse(response);
        }

        private void UpdateResponse(string response)
        {
            Dispatcher.Invoke(() =>
            {
                responseTextBox.Text = response;
            });
        }

        private void OpenApplication_Click(object sender, RoutedEventArgs e)
        {
            var currentProcessFileName = Process.GetCurrentProcess().MainModule.FileName;

            Process.Start(currentProcessFileName, "--child");
        }
    }
}

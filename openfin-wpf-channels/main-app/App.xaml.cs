using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;

namespace main_app
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        private void Application_Startup(object sender, StartupEventArgs e)
        {
            var window = e.Args.Contains("--child") ?
                new ChildWindow() as Window :
                new MainWindow() as Window;

            window.Show();
        }
    }
}

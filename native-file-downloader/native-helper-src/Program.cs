using log4net;
using System;
using System.Windows.Forms;

namespace NativeHelper
{
    static class Program
    {
        private static readonly ILog logger = LogManager.GetLogger(typeof(Program));
        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        [STAThread]
        static void Main(string[] args)
        {
            log4net.Config.XmlConfigurator.Configure();

            String id = null;

            if(args.Length > 0)
            {
                logger.Debug("Passed arguments");

                if(args.Length >= 2 && args[0] == "-i" && args[1] != null && args[1].Length > 0)
                {
                    logger.Debug("Passed -i identifier with value: " + args[1]);
                    id = args[1];
                }
            }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new FileHelper(id));
        }
    }
}

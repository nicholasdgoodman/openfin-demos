using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;

using System.Runtime.InteropServices;
using System.Reflection;
using Microsoft.Win32;
using Microsoft.Win32.SafeHandles;

namespace Installer
{
    class Program
    {
        // PER-USER INSTALL
        static readonly string InstallRoot = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

        // SYSTEM-WIDE INSTALL (REQUIRES ADMIN)
        //static readonly string InstallRoot = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);

        static readonly string ComClassAssemblyName = "LibraryWithComTypes.dll";
        static readonly string ComClassDirectory = Path.Combine(InstallRoot, "Sample Company", "Sample Product");
        static readonly string ComClassAssemblyPath = Path.Combine(ComClassDirectory, ComClassAssemblyName);

        static int Main(string[] args)
        {
            try
            {
                // Copy from the current directory to the target directory:
                Directory.CreateDirectory(ComClassDirectory);
                File.Copy(ComClassAssemblyName, ComClassAssemblyPath, true);

                var assembly = Assembly.LoadFile(ComClassAssemblyPath);

                // PER USER INSTALL - COMMENT OUT FOR SYSTEM-WIDE INSTALL (REQUIRES ADMIN)
                RegOverridePredefKey(Registry.ClassesRoot.Handle,
                    Registry.CurrentUser
                        .OpenSubKey("SOFTWARE")
                        .OpenSubKey("Classes").Handle);

                var registrationService = new RegistrationServices();
                registrationService.RegisterAssembly(assembly, AssemblyRegistrationFlags.SetCodeBase);
            }
            catch(Exception)
            {
                // This app runs headless and there's nothing to do
                // a more realistic example would have exception-specific return codes
                return -1;
            }

            return 0;
        }

        [DllImport("advapi32.dll", SetLastError = true)]
        private static extern long RegOverridePredefKey(SafeRegistryHandle hkey, SafeRegistryHandle hnewKey);
    }
}

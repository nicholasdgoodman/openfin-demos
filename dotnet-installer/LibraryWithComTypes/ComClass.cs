using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Runtime.InteropServices;

namespace LibraryWithComTypes
{
    [Guid("F9FCABF1-EAD6-468E-B45A-5116A09435F4"), ComVisible(true)]
    public interface ComInterface
    {
    }

    [Guid("C918F5A5-F24F-4D05-98E4-6C9DB8EAC529"), ComVisible(true)]
    [ClassInterface(ClassInterfaceType.None)]
    public class ComClass : ComInterface
    {
    }
}

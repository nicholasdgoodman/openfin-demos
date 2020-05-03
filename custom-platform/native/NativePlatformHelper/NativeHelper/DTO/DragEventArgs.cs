using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Newtonsoft.Json;

namespace NativeHelper.DTO
{
    class DragEventArgs
    {
        [JsonProperty("snapshot")]
        public Snapshot Snapshot { get; set; }

        [JsonProperty("source")]
        public WindowInfo Source { get; set; }
    }
}

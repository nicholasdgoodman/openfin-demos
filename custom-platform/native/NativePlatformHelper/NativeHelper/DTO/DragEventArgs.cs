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

        [JsonProperty("edges", NullValueHandling = NullValueHandling.Ignore)]
        private string[] Edges { get; set; }

        [JsonIgnore]
        public DragEventType DragType
        {
            get
            {
                var result = DragEventType.Move;

                if (Edges == null) return result;
                if (Edges.Contains("top")) result |= DragEventType.Top;
                if (Edges.Contains("bottom")) result |= DragEventType.Bottom;
                if (Edges.Contains("left")) result |= DragEventType.Left;
                if (Edges.Contains("right")) result |= DragEventType.Right;

                return result;
            }
            set
            {
                if (value == DragEventType.Move) Edges = null;

                var result = new List<string>();

                if (value.HasFlag(DragEventType.Top)) result.Add("top");
                if (value.HasFlag(DragEventType.Bottom)) result.Add("bottom");
                if (value.HasFlag(DragEventType.Left)) result.Add("left");
                if (value.HasFlag(DragEventType.Right)) result.Add("right");

                Edges = result.ToArray();
            }
        }
    }

    [Flags]
    enum DragEventType
    {
        Move = 0x00,
        Top = 0x01,
        Left = 0x02,
        Bottom = 0x04,
        Right = 0x08
    }
}

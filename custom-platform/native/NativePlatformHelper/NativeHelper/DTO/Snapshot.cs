using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace NativeHelper.DTO
{
    class Snapshot
    {
        [JsonProperty("snapshotDetails")]
        public SnapshotDetails Details { get; set; }

        [JsonProperty("windows")]
        public WindowInfo[] Windows { get; set; }
    }

    class SnapshotDetails
    {
        [JsonProperty("screens")]
        public ScreenInfo[] Screens { get; set; }

        [JsonExtensionData]
        public IDictionary<string, JToken> Properties { get; set; }
    }

    class ScreenInfo
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("primary")]
        public bool IsPrimary { get; set; }

        [JsonProperty("rect")]
        public NativeMethods.RECT Rectangle { get; set; }
    }

    class WindowInfo
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("nativeId")]
        private string NativeIdStr { get; set; }

        [JsonIgnore]
        public IntPtr NativeId
        {
            get { return new IntPtr(int.Parse(NativeIdStr.Substring(2), System.Globalization.NumberStyles.HexNumber)); }
            set { NativeIdStr = $"0x{(int)value:X8}"; }
        }

        [JsonProperty("windowRect", NullValueHandling = NullValueHandling.Ignore)]
        public NativeMethods.RECT Rectangle { get; set; }

        [JsonProperty("visibleEdges", NullValueHandling = NullValueHandling.Ignore)]
        public EdgeVisibility VisibleEdges { get; set; }

        [JsonProperty("customData")]
        public Dictionary<string, object> CustomData { get; set; }

        [JsonExtensionData]
        public IDictionary<string, JToken> Properties { get; set; }
    }

    class EdgeVisibility
    {
        [JsonProperty("top")]    public bool Top { get; set; }
        [JsonProperty("left")]   public bool Left { get; set; }
        [JsonProperty("bottom")] public bool Bottom { get; set; }
        [JsonProperty("right")]  public bool Right { get; set; }
    }
}

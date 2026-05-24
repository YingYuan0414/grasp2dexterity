import { WebViewer } from "@rerun-io/web-viewer";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function enableLoop(viewer, timeline = "frame") {
  let recordingId = null;
  let range = null;

  // Wait until recording and timeline are loaded.
  for (let i = 0; i < 100; i++) {
    recordingId = viewer.get_active_recording_id();

    if (recordingId !== null) {
      viewer.set_active_timeline(recordingId, timeline);
      range = viewer.get_time_range(recordingId, timeline);

      if (range !== null) {
        break;
      }
    }

    await sleep(100);
  }

  if (recordingId === null || range === null) {
    console.warn("Could not enable loop: recording or timeline not loaded.");
    return;
  }

  viewer.set_current_time(recordingId, timeline, range.min);
  viewer.set_playing(recordingId, true);

  viewer.on("time_update", () => {
    const t = viewer.get_current_time(recordingId, timeline);
    const r = viewer.get_time_range(recordingId, timeline);

    if (r !== null && t >= r.max) {
      viewer.set_current_time(recordingId, timeline, r.min);
      viewer.set_playing(recordingId, true);
    }
  });
}

async function startViewer(divId, rrdPath, timeline = "frame") {
  const parent = document.getElementById(divId);
  const rrdUrl = new URL(rrdPath, window.location.href).href;

  const viewer = new WebViewer();

  await viewer.start(rrdUrl, parent, {
    width: "100%",
    height: "520px",
    hide_welcome_screen: true,
  });

  await enableLoop(viewer, timeline);

  return viewer;
}

function lazyStartViewer(divId, rrdPath, timeline = "frame") {
  const elem = document.getElementById(divId);
  let started = false;

  const observer = new IntersectionObserver(async entries => {
    if (started) return;

    if (entries[0].isIntersecting) {
      started = true;
      observer.disconnect();

      await startViewer(divId, rrdPath, timeline);
    }
  }, {
    threshold: 0.2,
  });

  observer.observe(elem);
}

// Use "frame" if your Python used rr.set_time("frame", sequence=i).
// Use "log_tick" if your Python used rr.set_time("log_tick", sequence=int(tick)).
lazyStartViewer("rerun-viewer-1", "data/scissors_redesigned.rrd", "frame");
lazyStartViewer("rerun-viewer-2", "data/syringe_redesigned.rrd", "frame");
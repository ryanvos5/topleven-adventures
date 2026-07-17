import UIKit
import Capacitor
import AVFoundation

/**
 * Eigen bridge-view-controller.
 *  1. Registreert de lokale (niet-npm) Capacitor-plugin RymrIAP (auto-detectie pakt 'm niet op).
 *  2. Regelt de AVAudioSession. De Web Audio van de WKWebView hangt aan de audiosessie van de
 *     app. Bij backgrounden onderbreekt iOS die sessie; na lang op de achtergrond wordt 'ie zelfs
 *     gedeactiveerd. Dan helpt geen enkele JS-resume() -> muziek/geluid blijven weg tot een
 *     volledige herstart. We heractiveren de sessie daarom NATIVE zodra de app terugkomt (en na
 *     een onderbreking zoals een telefoontje), en geven de web-laag daarna een zetje.
 */
class MainViewController: CAPBridgeViewController {

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(RymrIAP())
        setupAudioSession()
    }

    private func setupAudioSession() {
        let session = AVAudioSession.sharedInstance()
        // .playback = geluid speelt ook met de mute-schakelaar aan (zoals nu); mixt met andere audio.
        try? session.setCategory(.playback, options: [.mixWithOthers])
        try? session.setActive(true)

        let nc = NotificationCenter.default
        nc.addObserver(self, selector: #selector(reactivateAudio),
                       name: UIApplication.didBecomeActiveNotification, object: nil)
        nc.addObserver(self, selector: #selector(reactivateAudio),
                       name: UIApplication.willEnterForegroundNotification, object: nil)
        nc.addObserver(self, selector: #selector(handleInterruption(_:)),
                       name: AVAudioSession.interruptionNotification, object: nil)
    }

    // App komt terug op de voorgrond -> audiosessie opnieuw activeren, daarna de web-audio wekken.
    @objc private func reactivateAudio() {
        try? AVAudioSession.sharedInstance().setActive(true)
        pokeWebAudio()
    }

    // Telefoontje / andere app pakte de audio -> zodra de onderbreking eindigt weer activeren.
    @objc private func handleInterruption(_ note: Notification) {
        guard let info = note.userInfo,
              let raw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        if type == .ended {
            try? AVAudioSession.sharedInstance().setActive(true)
            pokeWebAudio()
        }
    }

    // De web-laag laten hervatten (AudioContext.resume + muziek-loop herstarten).
    private func pokeWebAudio() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            self?.webView?.evaluateJavaScript("window.Sfx && Sfx.wake && Sfx.wake();", completionHandler: nil)
        }
    }

    deinit { NotificationCenter.default.removeObserver(self) }
}

class OcaProxy < Formula
  desc "OpenAI-compatible proxy for Oracle Code Assist (OCA)"
  homepage "https://github.com/banzalik/oca-proxy"
  license "MIT"
  version "1.0.6" # Update this to your release tag version (without the leading 'v')

  # Notes:
  # - This formula expects GitHub Release assets created by the release workflow:
  #   - oca-proxy-macos-x64.tar.gz
  #   - oca-proxy-macos-arm64.tar.gz (if built)
  #   - oca-proxy-linux-x64.tar.gz
  # - Update sha256 values after publishing a release:
  #   shasum -a 256 oca-proxy-<platform>-<arch>.tar.gz

  livecheck do
    url :homepage
    strategy :github_latest
  end

  on_macos do
    on_intel do
      url "https://github.com/banzalik/oca-proxy/releases/download/v#{version}/oca-proxy-macos-x64.tar.gz"
      sha256 "PUT_SHA256_FOR_MACOS_X64_HERE"
    end
    on_arm do
      url "https://github.com/banzalik/oca-proxy/releases/download/v#{version}/oca-proxy-macos-arm64.tar.gz"
      sha256 "PUT_SHA256_FOR_MACOS_ARM64_HERE"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/banzalik/oca-proxy/releases/download/v#{version}/oca-proxy-linux-x64.tar.gz"
      sha256 "PUT_SHA256_FOR_LINUX_X64_HERE"
    end
    # Uncomment if you publish Linux arm64 artifacts:
    # on_arm do
    #   url "https://github.com/banzalik/oca-proxy/releases/download/v#{version}/oca-proxy-linux-arm64.tar.gz"
    #   sha256 "PUT_SHA256_FOR_LINUX_ARM64_HERE"
    # end
  end

  def install
    target =
      if OS.mac?
        Hardware::CPU.arm? ? "oca-proxy-macos-arm64" : "oca-proxy-macos-x64"
      else
        Hardware::CPU.arm? ? "oca-proxy-linux-arm64" : "oca-proxy-linux-x64"
      end

    # Tarballs contain a single binary named by platform/arch; install as "oca-proxy"
    bin.install target => "oca-proxy"
  end

  def caveats
    <<~EOS
      oca-proxy is a prebuilt single-binary release.
      - To run: oca-proxy
      - Default port: 8669 (see README for configuration and auth)
      - For usage and endpoints, see: #{homepage}
    EOS
  end

  test do
    # Minimal smoke test: binary is installed and executable.
    assert_predicate bin/"oca-proxy", :exist?
    assert_predicate bin/"oca-proxy", :executable?

    # If oca-proxy implements a help/version flag, uncomment one of these:
    # output = shell_output("#{bin}/oca-proxy --version 2>&1 || true")
    # assert_match version.to_s, output
  end
end

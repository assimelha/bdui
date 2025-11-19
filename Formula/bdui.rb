class Bdui < Formula
  desc "Real-time Text User Interface for bd (beads) issue tracker"
  homepage "https://github.com/assimelha/bdui"
  version "0.1.0"
  license "MIT"

  if Hardware::CPU.arm?
    url "https://github.com/assimelha/bdui/releases/download/v0.1.0/bdui-macos-arm64"
    sha256 "040d3d0be637b54eb25380a55de6fd418fc84d7de9b04b451b673a683f07fe9b"
  else
    url "https://github.com/assimelha/bdui/releases/download/v0.1.0/bdui-macos-x64"
    sha256 "9c1e437eb4ee71516ddf75a76cbe19f2f96103501f6d681ebdc63c9ad0e01aae"
  end

  def install
    if Hardware::CPU.arm?
      bin.install "bdui-macos-arm64" => "bdui"
    else
      bin.install "bdui-macos-x64" => "bdui"
    end
  end

  test do
    assert_match "bdui", shell_output("#{bin}/bdui --help 2>&1", 1)
  end
end

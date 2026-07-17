// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "MomenKit",
    platforms: [.iOS(.v17), .macOS(.v13)],
    products: [
        .library(name: "MomenKit", targets: ["MomenKit"]),
    ],
    targets: [
        .target(name: "MomenKit"),
        .testTarget(name: "MomenKitTests", dependencies: ["MomenKit"]),
    ]
)

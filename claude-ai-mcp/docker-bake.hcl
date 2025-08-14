variable "DOCKERHUB_REPO" {
  default = "mtebusi/homeassistant-mcp-addon"
}

variable "GITHUB_REPO" {
  default = "ghcr.io/mtebusi/addon-claude-ai-mcp"
}

variable "VERSION" {
  default = "latest"
}

group "default" {
  targets = ["ha-addon"]
}

target "ha-addon" {
  context = "./claude-ai-mcp"
  dockerfile = "Dockerfile"
  platforms = [
    "linux/amd64",
    "linux/arm64",
    "linux/arm/v7",
    "linux/arm/v6",
    "linux/386"
  ]
  tags = [
    "${DOCKERHUB_REPO}:${VERSION}",
    "${DOCKERHUB_REPO}:latest",
    "${GITHUB_REPO}:${VERSION}",
    "${GITHUB_REPO}:latest"
  ]
  cache-from = [
    "type=registry,ref=${DOCKERHUB_REPO}:buildcache"
  ]
  cache-to = [
    "type=registry,ref=${DOCKERHUB_REPO}:buildcache,mode=max"
  ]
}
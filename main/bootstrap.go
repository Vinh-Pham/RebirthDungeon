components {
  id: "bootstrap"
  component: "/main/bootstrap.script"
}
components {
  id: "ui"
  component: "/game/ui/screens/playable.gui"
}
components {
  id: "music_mixer"
  component: "/assets/audio/music.sound"
}
components {
  id: "effects_mixer"
  component: "/assets/audio/effects.sound"
}
embedded_components {
  id: "nav_title"
  type: "collectionproxy"
  data: "collection: \"/game/ui/screens/navigation/title.collection\"\n"
}
embedded_components {
  id: "nav_characters"
  type: "collectionproxy"
  data: "collection: \"/game/ui/screens/navigation/characters.collection\"\n"
}
embedded_components {
  id: "nav_creation"
  type: "collectionproxy"
  data: "collection: \"/game/ui/screens/navigation/creation.collection\"\n"
}
embedded_components {
  id: "nav_arrival"
  type: "collectionproxy"
  data: "collection: \"/game/ui/screens/navigation/arrival.collection\"\n"
}
embedded_components {
  id: "nav_world"
  type: "collectionproxy"
  data: "collection: \"/game/ui/screens/navigation/world.collection\"\n"
}

package cloud.vinh.rebirthdungeon.data.content.dto
import cloud.vinh.rebirthdungeon.game.exploration.Service
class WorldDto {
    var version: Int? = null; var town: RoomDto? = null; var templates: List<RoomDto>? = null
    var objects: List<WorldObjectDto>? = null; var offers: List<OfferDto>? = null
    var rooms: Int? = null; var attempts: Int? = null; var reward: Int? = null; var startingGold: Int? = null; var encounter: String? = null
}
class RoomDto {
    var id: String? = null; var polygons: List<List<List<Int>>>? = null
    var entry: List<Int>? = null; var exit: List<Int>? = null; var spawn: List<Int>? = null
}
class WorldObjectDto {
    var id: String? = null; var name: String? = null; var position: List<Int>? = null; var approach: List<Int>? = null
    var service: Service? = null; var text: String? = null
}
class OfferDto { var potion: String? = null; var price: Int? = null; var capacity: Int? = null }

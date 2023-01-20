const RoomDto = require("../dtos/room-dto");
const roomService = require("../services/room-service");

class RoomsController{
    async create(req,res){
        // CREATION OF A ROOM LOGIC
        //REQ CONTAINS TOPIC AND ROOM TYPE
        const{topic,roomType}=req.body;
        if(!topic||!roomType){
            return res.status(400).json({message:"All fields are required!"})
        }
        const room=await roomService.create({
            topic,
            roomType,
            ownerId:req.user._id
        });
        return res.json(new RoomDto(room));
    }
    async index(req,res){
        const rooms=await roomService.getAllRooms(['open']);
        const allRooms=rooms.map(room=>new RoomDto(room)); // for formatting rooms
        return res.json(allRooms);
    }
}
module.exports=new RoomsController();
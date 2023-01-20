class UserDto{
    _id;
    phone;
    name;
    avatar;
    createdAt;
    activated;

    constructor(user){
        this._id=user._id;
        this.phone=user.phone;
        this.name=user.name;
        this.avatar=user.avatar;
        this.activated=user.activated;
        this.createdAt=user.createdAt;
    }
}
module.exports= UserDto;
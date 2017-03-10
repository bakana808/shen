
class FirebaseModeler {

	model(obj) {
		// user model
		if(obj instanceof User) {
			return {
				id: obj.id,
				nickname: obj.nickname,

			}
		}
	}
}

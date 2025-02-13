import mongoose from "mongoose";

const DialogueSchema = new mongoose.Schema({
  character: { type: String, required: true },
  dialogue: { type: String, required: true },
  user_message: { type: String, default: null }
});

DialogueSchema.index({ character: 1, user_message: 1 });

export default mongoose.model("Dialogue", DialogueSchema);
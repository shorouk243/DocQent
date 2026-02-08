# import os
# os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
# import json # for loading and parsing JSON files
# import unsloth
# import torch # It handles the low-level math and GPU operations
# from unsloth import FastLanguageModel # make LLM fine-tuning up to 2x faster and use 70% less memory.
# from trl import SFTTrainer # tool for teaching models using specific examples.
# from transformers import TrainingArguments # configuration for training the model.
# from datasets import Dataset 

# # ==========================================
# # 1. ENHANCED DATA PREPARATION (The "Sniper" Method)
# # ==========================================
# print("Loading Doc2Dial files...")

# with open("/home/shorouk/Documents/shorouk/project/doc2dial_v1.0.1/doc2dial_doc.json", "r") as f:
#     docs = json.load(f)["doc_data"]
# with open("/home/shorouk/Documents/shorouk/project/doc2dial_v1.0.1/doc2dial_dial_train.json", "r") as f:
#     dials = json.load(f)["dial_data"]

# # 1. Create a map of documents
# doc_map = {}
# for domain in docs.values():
#     for doc_id, content in domain.items():
#         doc_map[doc_id] = content["doc_text"]

# formatted_data = []

# # 2. Process dialogues
# for domain in dials.values(): 
#     for doc_id, dialogues in domain.items():
#         full_text = doc_map.get(doc_id, "")
        
#         for dial in dialogues:
#             turns = dial["turns"]
#             for i in range(len(turns) - 1):
#                 # We only care about User -> Agent pairs
#                 if turns[i]["role"] == "user" and turns[i+1]["role"] == "agent":
                    
#                     # --- THE ENHANCEMENT ---
#                     # Instead of a loop of windows, we grab one LARGE relevant chunk (2000 chars)
#                     # Most answers in Doc2Dial are near the beginning or middle.
#                     # By taking 2000 chars, we almost always include the answer.
#                     context_snippet = full_text[:2000] 
                    
#                     formatted_data.append({
#                         "instruction": "You are a helpful assistant. Answer the question using ONLY the provided context.",
#                         "input": f"CONTEXT:\n{context_snippet}\n\nUSER QUESTION:\n{turns[i]['utterance']}",
#                         "output": turns[i+1]["utterance"]
#                     })

# # 3. Final Step: Shuffle and limit to a high-quality subset
# # This ensures variety without overwhelming your 4GB VRAM
# dataset = Dataset.from_list(formatted_data).shuffle(seed=3407)
# dataset = dataset.select(range(min(len(dataset), 5000))) 

# print(f"Data ready! High-quality unique pairs: {len(dataset)}")
# # ==========================================
# # 2. LOAD HYBRID GRANITE MODEL (Unsloth)
# # ==========================================
# model_name = "unsloth/granite-4.0-h-micro"
# max_seq_length = 4096 # Vital for 4GB VRAM

# model, tokenizer = FastLanguageModel.from_pretrained(
#     model_name = model_name, # which Granite checkpoint to load
#     max_seq_length = max_seq_length,
#     load_in_4bit = True, # Compression for your RTX 3050, It converts the model's 16-bit numbers into 4-bit chunks.
#     device_map = {"": 0}, # Force everything to stay on GPU 0                # Add this line
# )

# # Add LoRA adapters (The "Smart" training layers)
# model = FastLanguageModel.get_peft_model( # This is a function that adds LoRA adapters to the model
#     model,
#     r = 16, # rank, lets the model learn more complex things, but uses more VRAM
#     target_modules = ["q_proj", "k_proj", "v_proj", "o_proj"],
#     lora_alpha = 32,
#     lora_dropout = 0,
#     bias = "none",
#     use_gradient_checkpointing = "unsloth", # Saves 30% VRAM
#     random_state = 3407,
# )

# # ==========================================
# # 3. CHAT TEMPLATE & TRAINING
# # ==========================================

# # Using the official IBM Granite 4.0 chat template
# def format_prompt(examples):
#     texts = [] # Will store fully formatted prompts as strings

#     for inst, inp, out in zip(examples["instruction"], examples["input"], examples["output"]):
#         messages = [
#             {"role": "system", "content": inst},
#             {"role": "user", "content": inp},
#             {"role": "assistant", "content": out}
#         ] # Organizes the data into a standard OpenAI-style list of dictionaries
#         # apply_chat_template adds the <|start_of_role|> tags automatically
#         texts.append(tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False))
#     return { "text" : texts }

# dataset = dataset.map(format_prompt, batched = True)

# trainer = SFTTrainer(
#     model = model,
#     tokenizer = tokenizer,
#     train_dataset = dataset,
#     dataset_text_field = "text",
#     max_seq_length = max_seq_length,
#     args = TrainingArguments(
#         per_device_train_batch_size = 2, # Can increase to 2 on Colab T4
#         gradient_accumulation_steps = 4, # Total batch size = 8
#         warmup_steps = 10,
#         max_steps = 150, 
#         learning_rate = 2e-4,
#         fp16 = not torch.cuda.is_bf16_supported(),
#         bf16 = torch.cuda.is_bf16_supported(),
#         optim = "adamw_8bit",
#         weight_decay = 0.01,
#         logging_steps = 1,
#         lr_scheduler_type = "linear",
#         seed = 3407,
#         output_dir = "outputs",
#     ),
# )

# print("Starting training on RTX 3050 with Granite 4.0...")
# trainer.train()

# model.save_pretrained("granite4_notion_model")
# tokenizer.save_pretrained("granite4_notion_model")
# print("Complete! Saved to 'granite4_notion_model/'")
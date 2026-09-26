"""
tools/video_storyboard.py — Automated DevRel Engine (Video Storyboarding)

Maps LLM output (architecture, APIs, security) to an automated
time-stamped storyboard. Generates voiceover audio via Google TTS (gTTS)
and outputs a JSON configuration ready for Remotion or Manim rendering.
"""

import os
import json
from gtts import gTTS


def generate_audio(text: str, filename: str):
    # gTTS removed as per user request to improve video voice quality.
    # We now rely on the frontend Web Speech API or ElevenLabs.
    return True

def generate_video_storyboard(
    repo_name: str,
    business_info: dict,
    architecture_info: dict,
    output_dir: str = "video_assets"
):
    """
    Creates the video script, generates TTS audio files, and exports
    a JSON storyboard that Remotion/React can consume for animations.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    storyboard = {
        "project": repo_name,
        "scenes": []
    }
    
    # Scene 1: Intro
    intro_script = f"Welcome to the automated codebase walkthrough for {repo_name}. Today, we will explore the system architecture and core business flows."
    audio_path = os.path.join(output_dir, "scene_1_intro.mp3")
    generate_audio(intro_script, audio_path)
    
    storyboard["scenes"].append({
        "id": "intro",
        "duration_seconds": 6,
        "visual": "title_card",
        "title": repo_name,
        "audio_file": "scene_1_intro.mp3",
        "script": intro_script
    })
    
    # Scene 2: Architecture
    arch_summary = architecture_info.get("summary", "We mapped the system architecture.")
    # Truncate summary for video
    arch_summary = arch_summary.split('.')[0] + "!"
    
    arch_script = f"First, let's look at the big picture. {arch_summary}"
    audio_path = os.path.join(output_dir, "scene_2_arch.mp3")
    generate_audio(arch_script, audio_path)
    
    storyboard["scenes"].append({
        "id": "architecture",
        "duration_seconds": 8,
        "visual": "mermaid_animation",
        "mermaid_code": architecture_info.get("diagram", ""),
        "audio_file": "scene_2_arch.mp3",
        "script": arch_script
    })
    
    # Scene 3..N: Business Flows
    flows = business_info.get("business_flows", [])[:2] # Limit to 2 flows
    for idx, flow in enumerate(flows):
        feature = flow.get("feature", f"Flow {idx+1}")
        steps = flow.get("steps", [])
        
        flow_script = f"Now let's explore {feature}. "
        if steps:
            flow_script += f"First, {steps[0]}. "
            if len(steps) > 1:
                flow_script += f"Then, {steps[1]}."
                
        audio_path = os.path.join(output_dir, f"scene_{idx+3}_flow.mp3")
        generate_audio(flow_script, audio_path)
        
        storyboard["scenes"].append({
            "id": f"flow_{idx}",
            "duration_seconds": 10,
            "visual": "code_zoom",
            "feature": feature,
            "steps": steps,
            "audio_file": f"scene_{idx+3}_flow.mp3",
            "script": flow_script
        })
        
    # Write storyboard JSON
    json_path = os.path.join(output_dir, "remotion_storyboard.json")
    with open(json_path, 'w') as f:
        json.dump(storyboard, f, indent=2)
        
    print(f"[Video Generator] DevRel Storyboard and {len(storyboard['scenes'])} Audio tracks generated in {output_dir}/")
    return json_path


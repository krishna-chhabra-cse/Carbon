import zlib
import struct
import math

def create_carbon_icon(output_path="icon.png", size=128):
    width = size
    height = size
    
    # RGBA buffer
    pixels = []
    
    cx, cy = size / 2.0, size / 2.0
    r_center = size * 0.1
    
    for y in range(height):
        row = []
        for x in range(width):
            # Base dark cosmic background: #060813
            r, g, b, a = 6, 8, 19, 255
            
            # Rounded corner clip (radius = 28 for 128x128)
            corner_r = size * 0.22
            dx = min(x, width - 1 - x)
            dy = min(y, height - 1 - y)
            if dx < corner_r and dy < corner_r:
                corner_dist = math.hypot(corner_r - dx, corner_r - dy)
                if corner_dist > corner_r:
                    # Antialiasing on corner
                    alpha = max(0, min(1, corner_r - corner_dist + 1))
                    a = int(alpha * 255)
            
            # Subtle radial background glow
            dist_center = math.hypot(x - cx, y - cy)
            glow = max(0.0, 1.0 - (dist_center / (size * 0.48)))
            r = int(min(255, r + 20 * glow))
            g = int(min(255, g + 45 * glow))
            b = int(min(255, b + 90 * glow))
            
            # Orbit 1: rotated -30 deg, cyan (#38bdf8)
            # transform point
            rad1 = math.radians(30)
            tx1 = (x - cx) * math.cos(rad1) - (y - cy) * math.sin(rad1)
            ty1 = (x - cx) * math.sin(rad1) + (y - cy) * math.cos(rad1)
            rx1, ry1 = size * 0.36, size * 0.14
            norm1 = (tx1*tx1)/(rx1*rx1) + (ty1*ty1)/(ry1*ry1)
            dist_ring1 = abs(norm1 - 1.0)
            if dist_ring1 < 0.18:
                ring_alpha = max(0.0, 1.0 - dist_ring1 / 0.18) * 0.8
                r = int(r * (1 - ring_alpha) + 56 * ring_alpha)
                g = int(g * (1 - ring_alpha) + 189 * ring_alpha)
                b = int(b * (1 - ring_alpha) + 248 * ring_alpha)

            # Orbit 2: rotated +30 deg, indigo/purple (#818cf8)
            rad2 = math.radians(-30)
            tx2 = (x - cx) * math.cos(rad2) - (y - cy) * math.sin(rad2)
            ty2 = (x - cx) * math.sin(rad2) + (y - cy) * math.cos(rad2)
            rx2, ry2 = size * 0.36, size * 0.14
            norm2 = (tx2*tx2)/(rx2*rx2) + (ty2*ty2)/(ry2*ry2)
            dist_ring2 = abs(norm2 - 1.0)
            if dist_ring2 < 0.18:
                ring_alpha = max(0.0, 1.0 - dist_ring2 / 0.18) * 0.8
                r = int(r * (1 - ring_alpha) + 129 * ring_alpha)
                g = int(g * (1 - ring_alpha) + 140 * ring_alpha)
                b = int(b * (1 - ring_alpha) + 248 * ring_alpha)

            # Glowing Center Core: (#38bdf8 with white nucleus)
            if dist_center < r_center * 2.2:
                core_glow = max(0.0, 1.0 - dist_center / (r_center * 2.2))
                r = int(min(255, r + 56 * core_glow * 1.5))
                g = int(min(255, g + 189 * core_glow * 1.5))
                b = int(min(255, b + 248 * core_glow * 1.5))
            
            if dist_center < r_center:
                nucleus = max(0.0, 1.0 - dist_center / r_center)
                r = int(min(255, r + 200 * nucleus))
                g = int(min(255, g + 240 * nucleus))
                b = int(min(255, b + 255 * nucleus))
            
            row.extend([r, g, b, a])
        pixels.append(bytes(row))

    # Construct PNG binary
    def png_chunk(chunk_type, data):
        return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", zlib.crc32(chunk_type + data) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = png_chunk(b'IHDR', struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)) # 8-bit RGBA
    
    raw_data = b''.join(b'\x00' + row for row in pixels)
    idat = png_chunk(b'IDAT', zlib.compress(raw_data, 9))
    iend = png_chunk(b'IEND', b'')

    with open(output_path, "wb") as f:
        f.write(header + ihdr + idat + iend)

    print(f"Generated {size}x{size} Carbon extension icon at {output_path}")

if __name__ == "__main__":
    import os
    os.makedirs("media", exist_ok=True)
    create_carbon_icon("icon.png", 128)
    create_carbon_icon("media/icon.png", 256)

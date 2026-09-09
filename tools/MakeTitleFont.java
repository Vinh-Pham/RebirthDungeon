import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.List;

/**
 * Offline tool: rasterizes the Press Start 2P TTF (tools/fonts/) into libGDX
 * AngelCode bitmap fonts (.fnt + .png) for the title screen, so the runtime
 * needs no font-rendering dependency beyond BitmapFont.
 *
 * Usage: java tools/MakeTitleFont.java
 * Writes assets/ui/title-<size>.fnt/.png for every size listed below.
 * Re-run after changing sizes or the TTF; output is deterministic.
 */
public class MakeTitleFont {
    /** Design sizes taken from the Penpot title screen board (title 52, button 20). */
    private static final int[] SIZES = {52, 20};
    private static final File TTF = new File("tools/fonts/PressStart2P-Regular.ttf");
    private static final File OUT_DIR = new File("assets/ui");
    private static final int PAD = 2; // transparent margin per glyph against texture bleeding
    private static final int FIRST_CHAR = 32, LAST_CHAR = 126;

    public static void main(String[] args) throws Exception {
        if (!TTF.isFile()) throw new IllegalStateException("missing " + TTF);
        OUT_DIR.mkdirs();
        for (int size : SIZES)
            generate(size);
        System.out.println("done");
    }

    private static void generate(int size) throws Exception {
        Font font = Font.createFont(Font.TRUETYPE_FONT, TTF).deriveFont((float) size);
        BufferedImage probe = new BufferedImage(1, 1, BufferedImage.TYPE_INT_ARGB);
        Graphics2D pg = probe.createGraphics();
        pg.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_OFF);
        FontMetrics fm = pg.getFontMetrics(font);
        int advance = fm.charWidth('M'); // Press Start 2P is monospace
        int ascent = fm.getAscent(), descent = fm.getDescent();
        pg.dispose();

        int cellW = advance + 2 * PAD, cellH = ascent + descent + 2 * PAD;
        List<BufferedImage> glyphs = new ArrayList<>();
        for (int c = FIRST_CHAR; c <= LAST_CHAR; c++)
            glyphs.add(renderGlyph(font, (char) c, cellW, cellH, ascent));

        int count = glyphs.size();
        // Roughly square grid, rounded up to power-of-two page dimensions.
        int cols = (int) Math.ceil(Math.sqrt(count));
        int pageW = 256;
        while (pageW / cellW < cols)
            pageW *= 2;
        cols = pageW / cellW;
        int rows = (count + cols - 1) / cols;
        int pageH = 256;
        while (pageH < rows * cellH)
            pageH *= 2;

        BufferedImage page = new BufferedImage(pageW, pageH, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = page.createGraphics();
        StringBuilder chars = new StringBuilder();
        int id = 0;
        for (int i = 0; i < count; i++) {
            int cx = (i % cols) * cellW, cy = (i / cols) * cellH;
            g.drawImage(glyphs.get(i), cx, cy, null);
            chars.append(String.format("char id=%d x=%d y=%d width=%d height=%d xoffset=%d yoffset=%d xadvance=%d page=0 chnl=15%n",
                FIRST_CHAR + i, cx, cy, cellW, cellH, -PAD, -PAD, advance));
            id++;
        }
        g.dispose();
        if (id != count) throw new IllegalStateException("glyph count mismatch");

        String name = "title-" + size;
        ImageIO.write(page, "png", new File(OUT_DIR, name + ".png"));
        PrintWriter out = new PrintWriter(new File(OUT_DIR, name + ".fnt"), "UTF-8");
        out.printf("info face=\"Press Start 2P\" size=%d bold=0 italic=0 charset=\"\" unicode=1 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=1,1%n", size);
        out.printf("common lineHeight=%d base=%d scaleW=%d scaleH=%d pages=1 packed=0 alphaChnl=0 redChnl=0 greenChnl=0 blueChnl=0%n",
            ascent + descent, ascent, pageW, pageH);
        out.printf("page id=0 file=\"%s.png\"%n", name);
        out.printf("chars count=%d%n", count);
        out.print(chars);
        out.print("kernings count=0");
        out.close();
        System.out.println(name + ": " + count + " glyphs, page " + pageW + "x" + pageH +
            ", advance " + advance + ", lineHeight " + (ascent + descent));
    }

    /** Draws one glyph into a uniform padded cell, baseline at (PAD, PAD + ascent). */
    private static BufferedImage renderGlyph(Font font, char c, int cellW, int cellH, int ascent) {
        BufferedImage img = new BufferedImage(cellW, cellH, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_ALPHA_INTERPOLATION, RenderingHints.VALUE_ALPHA_INTERPOLATION_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_OFF);
        g.setFont(font);
        g.setColor(Color.WHITE);
        g.drawString(String.valueOf(c), PAD, PAD + ascent);
        g.dispose();
        return img;
    }
}

const API_KEY = 'AIzaSyAMy9QN3WuwQtn2EkDK0Gc74G6dBMt1bwA';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

document.addEventListener('DOMContentLoaded', function() {
  const reportForm = document.getElementById('reportForm');
  const loadingElement = document.getElementById('loading');
  const resultElement = document.getElementById('result');
  const reportContentElement = document.getElementById('reportContent');
  const downloadBtn = document.getElementById('downloadBtn');

  // Handle form submission
  reportForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form values
    const topic = document.getElementById('topic').value;
    const level = document.getElementById('level').value;
    const pageCount = document.getElementById('pageCount').value;

    if (!topic) {
      alert('Please enter a topic');
      return;
    }

    // Show loading spinner
    loadingElement.classList.remove('hidden');
    resultElement.classList.add('hidden');

    try {
      const report = await generateReport(topic, level, pageCount);
      displayReport(report);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      loadingElement.classList.add('hidden');
    }
  });

  // Generate report using the Gemini API
  async function generateReport(topic, level, pageCount) {
    // Calculate approximate word count based on pages (average 250-300 words per page)
    const wordCount = pageCount * 300;
    
    const educationLevel = level === 'school' ? 'high school' : 'undergraduate college';
    
    const prompt = `Write a well-structured report on "${topic}" suitable for ${educationLevel} level. 
                    The report should be approximately ${wordCount} words (to fill about ${pageCount} pages). 
                    Include an introduction, main sections with relevant information, and a conclusion.
                    Format with clear section headings and organize the content well.
                    Use appropriate language for ${educationLevel} students.
                    Include a "References" section at the very end with at least 5 relevant academic sources.
                    Do not use any markdown formatting (no asterisks, backticks, or other special characters).`;
    
    // Prepare the request to the Gemini API
    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096
      }
    };
    
    // Make the API request
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the generated text from the response
    if (data.candidates && data.candidates[0]?.content?.parts) {
      // Clean up the response to remove any markdown formatting characters
      let text = data.candidates[0].content.parts[0].text;
      text = text.replace(/\*\*\*/g, '')  // Remove bold italic markers
              .replace(/\*\*/g, '')       // Remove bold markers
              .replace(/\*/g, '')         // Remove italic markers
              .replace(/```[\s\S]*?```/g, '') // Remove code blocks
              .replace(/`/g, '');         // Remove inline code markers
      
      return text;
    } else {
      throw new Error('Unexpected API response format');
    }
  }

  // Display the generated report
  function displayReport(reportText) {
    // Remove any remaining markdown formatting
    const cleanText = reportText
      .replace(/\*\*\*/g, '')  // Remove bold italic markers
      .replace(/\*\*/g, '')    // Remove bold markers
      .replace(/\*/g, '')      // Remove italic markers
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`/g, '');      // Remove inline code markers
      
    // Format the text with paragraph breaks
    const formattedText = cleanText
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    reportContentElement.innerHTML = `<p>${formattedText}</p>`;
    resultElement.classList.remove('hidden');
    
    // Scroll to the result
    resultElement.scrollIntoView({ behavior: 'smooth' });
  }

  // Handle report download as PDF
  downloadBtn.addEventListener('click', function() {
    const topic = document.getElementById('topic').value;
    const reportText = reportContentElement.innerText;
    
    // Create a safe filename from the topic
    const filename = `${topic.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-report.pdf`;
    
    // Make sure jsPDF is loaded properly
    if (typeof window.jspdf === 'undefined') {
      // Try alternate ways of accessing jsPDF
      if (typeof window.jsPDF !== 'undefined') {
        createAndDownloadPDF(reportText, filename, window.jsPDF);
      } else {
        alert('PDF library not loaded. Downloading as text file instead.');
        downloadAsText(reportText, filename.replace('.pdf', '.txt'));
      }
    } else {
      createAndDownloadPDF(reportText, filename, window.jspdf.jsPDF);
    }
  });
  
  // Function to create and download PDF
  function createAndDownloadPDF(reportText, filename, jsPDFConstructor) {
    try {
      // Clean up any remaining markdown characters
      const cleanText = reportText
        .replace(/\*\*\*/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`/g, '');
      
      // Create new PDF document
      const doc = new jsPDFConstructor();
      
      // Set document properties
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15; // Margins in mm
      
      // Extract headings for table of contents - focus on main sections only
      const paragraphs = cleanText.split('\n\n');
      let tableOfContents = [];
      let mainContentParagraphs = [];
      
      // Keywords for main sections to include in TOC
      const mainSectionKeywords = [
        'introduction', 'overview', 'background',
        'feature', 'features',
        'application', 'applications',
        'advantage', 'advantages',
        'disadvantage', 'disadvantages',
        'benefit', 'benefits',
        'methodology', 'methods',
        'result', 'results',
        'finding', 'findings',
        'discussion',
        'conclusion',
        'summary',
        'recommendation', 'recommendations',
        'reference', 'references', 'bibliography'
      ];
      
      // First pass: Identify headings and build TOC
      paragraphs.forEach(paragraph => {
        const trimmedParagraph = paragraph.trim();
        if (!trimmedParagraph) return;
        
        // Check if paragraph is a main heading (for TOC)
        const lowerParagraph = trimmedParagraph.toLowerCase();
        const isMainHeading = 
          trimmedParagraph.length < 50 && 
          !trimmedParagraph.endsWith('.') && 
          !trimmedParagraph.includes('. ') &&
          mainSectionKeywords.some(keyword => lowerParagraph.includes(keyword));
        
        // Check if paragraph is any heading (for formatting)
        const isHeading = isMainHeading || 
          (trimmedParagraph.length < 50 && 
           !trimmedParagraph.endsWith('.') && 
           (!trimmedParagraph.includes('. ') || trimmedParagraph.endsWith(':')));
        
        // Add main headings to table of contents
        if (isMainHeading) {
          tableOfContents.push({
            title: trimmedParagraph,
            page: null
          });
        }
        
        mainContentParagraphs.push({
          text: trimmedParagraph,
          isHeading: isHeading,
          isMainHeading: isMainHeading
        });
      });
      
      // Add "Table of Contents" page
      doc.setFont(undefined, 'bold');
      doc.setFontSize(16);
      doc.text("Table of Contents", margin, 20);
      
      // Add content pages starting with page 2
      doc.addPage();
      let currentPage = 2;
      let y = 20;
      
      // Second pass: Add content and track heading positions
      for (let i = 0; i < mainContentParagraphs.length; i++) {
        const paragraph = mainContentParagraphs[i];
        
        if (paragraph.isMainHeading) {
          // Record which page this heading is on
          for (let j = 0; j < tableOfContents.length; j++) {
            if (tableOfContents[j].title === paragraph.text) {
              tableOfContents[j].page = currentPage;
              break;
            }
          }
        }
        
        // Format based on if it's a heading
        if (paragraph.isHeading) {
          doc.setFont(undefined, 'bold');
          doc.setFontSize(13);
          y += 5; // Extra space before heading
        } else {
          doc.setFont(undefined, 'normal');
          doc.setFontSize(12);
        }
        
        // Split text to fit width
        const textLines = doc.splitTextToSize(paragraph.text, pageWidth - (margin * 2));
        
        // Check if we need to add a new page
        if (y + (textLines.length * 7) > pageHeight - margin) {
          doc.addPage();
          currentPage++;
          y = 20;
          
          // If this was a main heading that got pushed to a new page, update its page number
          if (paragraph.isMainHeading) {
            for (let j = 0; j < tableOfContents.length; j++) {
              if (tableOfContents[j].title === paragraph.text) {
                tableOfContents[j].page = currentPage;
                break;
              }
            }
          }
        }
        
        // Add text to PDF
        doc.text(textLines, margin, y);
        
        // Update y position for next paragraph
        y += (textLines.length * 7) + (paragraph.isHeading ? 5 : 3);
      }
      
      // Now go back to the first page and fill in the table of contents with page numbers
      doc.setPage(1);
      y = 30; // Position after "Table of Contents" heading
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(12);
      
      tableOfContents.forEach((item, index) => {
        if (item.page) {
          const tocLine = `${item.title}`;
          const pageText = `${item.page}`;
          
          // Draw the title
          doc.text(tocLine, margin, y);
          
          // Calculate position for the page number (right-aligned)
          const pageWidth = doc.getStringUnitWidth(pageText) * doc.internal.getFontSize() / doc.internal.scaleFactor;
          doc.text(pageText, doc.internal.pageSize.getWidth() - margin - pageWidth, y);
          
          // Add dotted line between title and page number
          const titleWidth = doc.getStringUnitWidth(tocLine) * doc.internal.getFontSize() / doc.internal.scaleFactor;
          const lineStart = margin + titleWidth + 3;
          const lineEnd = doc.internal.pageSize.getWidth() - margin - pageWidth - 3;
          
          // Draw dotted line
          const dotSpacing = 1;
          for (let i = lineStart; i < lineEnd; i += dotSpacing * 2) {
            doc.line(i, y - 2, i + dotSpacing, y - 2);
          }
          
          y += 8;
        }
      });
      
      // Save the PDF
      doc.save(filename);
      
    } catch (error) {
      console.error('Error creating PDF:', error);
      alert('Error creating PDF. Downloading as text instead.');
      downloadAsText(reportText, filename.replace('.pdf', '.txt'));
    }
  }
  
  // Fallback function to download as text
  function downloadAsText(text, filename) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  // Add responsive behaviors for mobile devices
  function handleResponsiveLayout() {
    const isMobile = window.innerWidth < 768;
    const formGroups = document.querySelectorAll('.form-group');
    
    if (isMobile) {
      formGroups.forEach(group => {
        group.style.marginBottom = '15px';
      });
    } else {
      formGroups.forEach(group => {
        group.style.marginBottom = '20px';
      });
    }
  }

  // Initialize responsive layout
  handleResponsiveLayout();
  
  // Update responsive layout on window resize
  window.addEventListener('resize', handleResponsiveLayout);
});

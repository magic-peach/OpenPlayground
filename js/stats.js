    // Fetch data from projects.json
    fetch('./projects.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch projects.json: ${response.status} ${response.statusText}`);
        }
        return response.text();
      })
      .then(text => {
        // Remove all types of BOMs (UTF-8, UTF-16, UTF-32)
        text = text.replace(/^\uFEFF/, ''); // UTF-8 BOM
        text = text.replace(/^\ufeff/, ''); // Alternative BOM
        text = text.replace(/^[\uFEFF\uFFFE\u0000\uFFFF]+/, ''); // Any BOM variants
        
        // Also strip any leading non-JSON characters until we find '[' or '{'
        const jsonStart = text.search(/[\[\{]/);
        if (jsonStart > 0) {
          console.warn('Stripped', jsonStart, 'invalid leading characters');
          text = text.substring(jsonStart);
        }
        
        // Try to parse JSON with better error handling
        let projects;
        try {
          projects = JSON.parse(text);
        } catch (e) {
          console.error('JSON Parse Error:', e);
          console.error('Raw response (first 500 chars):', text.substring(0, 500));
          console.error('Char codes:', Array.from(text.substring(0, 10)).map(c => c.charCodeAt(0)));
          throw new Error(`Invalid JSON: ${e.message}`);
        }
        return projects;
      })
      .then(projects => {
        // Count unique projects and categories
        const seenTitles = new Set();
        const categoryCount = {};

        projects.forEach(project => {
          // Validate and trim title
          const title = project.title ? project.title.trim() : '';
          if (!title || !project.link) return;
          
          // Skip duplicates (case-insensitive)
          const titleKey = title.toLowerCase();
          if (seenTitles.has(titleKey)) return;
          seenTitles.add(titleKey);

          // Normalize category (handle plurals, lowercase, and spaces)
          let category = (project.category || 'other')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_');
          
          // Normalize plural categories to singular
          const pluralMap = {
            'games': 'game',
            'puzzles': 'puzzle',
            'utilities': 'utility'
          };
          category = pluralMap[category] || category;
          
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        });

        renderStats(categoryCount, seenTitles.size);
        renderChart(categoryCount);
        
        // Show content
        document.getElementById('loading').style.display = 'none';
        document.getElementById('statsSummary').style.display = 'grid';
        document.getElementById('statsGrid').style.display = 'grid';
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        document.getElementById('loading').innerHTML = `
          <div style="color: var(--orange-500); font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <p>Failed to load project data. Please try refreshing the page.</p>
          <p style="font-size: 14px; color: var(--gray-500); margin-top: 8px;">Error: ${error.message}</p>
        `;
      });

    function renderStats(categoryCount, totalUnique) {
      // Update main stats
      document.getElementById('totalProjects').textContent = totalUnique;
      document.getElementById('totalCategories').textContent = Object.keys(categoryCount).length;

      // Render category cards
      const grid = document.getElementById('statsGrid');
      grid.innerHTML = '';

      const sortedCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1]);

      const categoryIcons = {
        utility: 'ri-tools-line',
        game: 'ri-gamepad-line',
        puzzle: 'ri-puzzle-line',
        fun: 'ri-magic-line',
        communication: 'ri-chat-3-line',
        educational: 'ri-book-open-line',
        productivity: 'ri-task-line',
        creative: 'ri-palette-line',
        web: 'ri-global-line',
        mobile: 'ri-smartphone-line',
        desktop: 'ri-computer-line',
        ai: 'ri-cpu-line',
        data: 'ri-database-2-line',
        other: 'ri-folder-3-line'
      };

      sortedCategories.forEach(([cat, count], index) => {
        const icon = categoryIcons[cat] || 'ri-folder-3-line';
        const percentage = ((count / totalUnique) * 100).toFixed(1);
        
        grid.innerHTML += `
          <div class="stat-card">
            <h3><i class="${icon}"></i> ${capitalize(cat)}</h3>
            <span>${count}</span>
            <div class="percentage">
              <i class="ri-pie-chart-line"></i>
              ${percentage}% of total
            </div>
          </div>
        `;
      });
    }

    function renderChart(categoryCount) {
      const ctx = document.getElementById("categoryChart");
      
      // Orange gradient colors
      const orangeGradients = [
        'rgba(251, 146, 60, 0.9)',
        'rgba(249, 115, 22, 0.9)',
        'rgba(234, 88, 12, 0.9)',
        'rgba(194, 65, 12, 0.9)',
        'rgba(253, 186, 116, 0.9)',
        'rgba(245, 158, 11, 0.9)',
        'rgba(217, 119, 6, 0.9)'
      ];

      new Chart(ctx, {
        type: "bar",
        data: {
          labels: Object.keys(categoryCount).map(capitalize),
          datasets: [{
            data: Object.values(categoryCount),
            backgroundColor: orangeGradients.slice(0, Object.keys(categoryCount).length),
            borderRadius: 12,
            borderWidth: 0,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: 'rgba(249, 115, 22, 0.3)',
              borderWidth: 1,
              cornerRadius: 8,
              padding: 12,
              callbacks: {
                label: function(context) {
                  const value = context.raw;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${context.label}: ${value} projects (${percentage}%)`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(251, 146, 60, 0.1)',
                drawBorder: false
              },
              ticks: {
                stepSize: 1,
                color: 'var(--gray-600)',
                font: {
                  weight: 500
                }
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: 'var(--gray-700)',
                font: {
                  weight: 600,
                  size: 13
                }
              }
            }
          },
          animation: {
            duration: 1000,
            easing: 'easeOutQuart'
          }
        }
      });
    }

    function capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
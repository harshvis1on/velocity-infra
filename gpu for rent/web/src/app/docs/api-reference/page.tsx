'use client'

import { useEffect, useRef } from 'react'

export default function ApiReferencePage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js'
    script.onload = () => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css'
      document.head.appendChild(link)

      const style = document.createElement('style')
      style.textContent = `
        #swagger-ui .swagger-ui {
          color: #e0e0e0;
        }
        #swagger-ui .swagger-ui .topbar { display: none; }
        #swagger-ui .swagger-ui .info .title { color: #fff; }
        #swagger-ui .swagger-ui .info p,
        #swagger-ui .swagger-ui .info li { color: #aaa; }
        #swagger-ui .swagger-ui .opblock-tag { color: #ddd; border-color: rgba(255,255,255,0.1); }
        #swagger-ui .swagger-ui .opblock { border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); }
        #swagger-ui .swagger-ui .opblock .opblock-summary { border-color: rgba(255,255,255,0.05); }
        #swagger-ui .swagger-ui .opblock .opblock-summary-description { color: #aaa; }
        #swagger-ui .swagger-ui .opblock .opblock-section-header { background: rgba(255,255,255,0.03); }
        #swagger-ui .swagger-ui .opblock-body pre { background: #111; color: #ccc; }
        #swagger-ui .swagger-ui .model-box { background: rgba(255,255,255,0.02); }
        #swagger-ui .swagger-ui table thead tr td,
        #swagger-ui .swagger-ui table thead tr th { color: #aaa; border-color: rgba(255,255,255,0.1); }
        #swagger-ui .swagger-ui .parameter__name { color: #ddd; }
        #swagger-ui .swagger-ui .parameter__type { color: #999; }
        #swagger-ui .swagger-ui .response-col_status { color: #ddd; }
        #swagger-ui .swagger-ui .response-col_description { color: #aaa; }
        #swagger-ui .swagger-ui .btn { border-color: rgba(255,255,255,0.2); color: #ddd; }
        #swagger-ui .swagger-ui select { background: #1a1a1a; color: #ddd; border-color: rgba(255,255,255,0.2); }
        #swagger-ui .swagger-ui input[type=text] { background: #1a1a1a; color: #ddd; border-color: rgba(255,255,255,0.2); }
        #swagger-ui .swagger-ui textarea { background: #1a1a1a; color: #ddd; }
        #swagger-ui .swagger-ui .model { color: #ccc; }
        #swagger-ui .swagger-ui .model-title { color: #ddd; }
        #swagger-ui .swagger-ui section.models { border-color: rgba(255,255,255,0.1); }
        #swagger-ui .swagger-ui section.models h4 { color: #ddd; }
      `
      document.head.appendChild(style)

      if ((window as any).SwaggerUIBundle) {
        ;(window as any).SwaggerUIBundle({
          url: '/openapi.yaml',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            (window as any).SwaggerUIBundle.presets.apis,
            (window as any).SwaggerUIBundle.SwaggerUIStandalonePreset,
          ],
          layout: 'BaseLayout',
          defaultModelsExpandDepth: 1,
          docExpansion: 'list',
          tryItOutEnabled: false,
        })
      }
    }
    document.body.appendChild(script)
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">API Reference</h1>
      <p className="text-gray-400 mb-8">
        Interactive docs for the Velocity API. Authenticate with your <code className="text-primary font-mono text-sm">vi_live_*</code> API key.
      </p>
      <div
        id="swagger-ui"
        ref={containerRef}
        className="bg-[#0e0e0e] border border-white/10 rounded-xl overflow-hidden min-h-[600px]"
      />
    </div>
  )
}

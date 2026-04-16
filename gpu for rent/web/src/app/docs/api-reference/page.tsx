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
          color: #E2E8F0;
        }
        #swagger-ui .swagger-ui .topbar { display: none; }
        #swagger-ui .swagger-ui .info .title { color: #fff; }
        #swagger-ui .swagger-ui .info p,
        #swagger-ui .swagger-ui .info li { color: #94A3B8; }
        #swagger-ui .swagger-ui .opblock-tag { color: #E2E8F0; border-color: rgba(255,255,255,0.06); }
        #swagger-ui .swagger-ui .opblock { border-color: rgba(255,255,255,0.06); background: rgba(255,255,255,0.03); }
        #swagger-ui .swagger-ui .opblock .opblock-summary { border-color: rgba(255,255,255,0.05); }
        #swagger-ui .swagger-ui .opblock .opblock-summary-description { color: #94A3B8; }
        #swagger-ui .swagger-ui .opblock .opblock-section-header { background: rgba(255,255,255,0.03); }
        #swagger-ui .swagger-ui .opblock-body pre { background: #080D16; color: #E2E8F0; }
        #swagger-ui .swagger-ui .model-box { background: rgba(255,255,255,0.03); }
        #swagger-ui .swagger-ui table thead tr td,
        #swagger-ui .swagger-ui table thead tr th { color: #94A3B8; border-color: rgba(255,255,255,0.06); }
        #swagger-ui .swagger-ui .parameter__name { color: #E2E8F0; }
        #swagger-ui .swagger-ui .parameter__type { color: #64748B; }
        #swagger-ui .swagger-ui .response-col_status { color: #E2E8F0; }
        #swagger-ui .swagger-ui .response-col_description { color: #94A3B8; }
        #swagger-ui .swagger-ui .btn { border-color: rgba(255,255,255,0.12); color: #E2E8F0; }
        #swagger-ui .swagger-ui select { background: #080D16; color: #E2E8F0; border-color: rgba(255,255,255,0.12); }
        #swagger-ui .swagger-ui input[type=text] { background: #080D16; color: #E2E8F0; border-color: rgba(255,255,255,0.12); }
        #swagger-ui .swagger-ui textarea { background: #080D16; color: #E2E8F0; }
        #swagger-ui .swagger-ui .model { color: #E2E8F0; }
        #swagger-ui .swagger-ui .model-title { color: #E2E8F0; }
        #swagger-ui .swagger-ui section.models { border-color: rgba(255,255,255,0.06); }
        #swagger-ui .swagger-ui section.models h4 { color: #E2E8F0; }
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
      <h1 className="font-heading text-3xl font-bold mb-2 text-white">API Reference</h1>
      <p className="text-[#94A3B8] mb-8">
        Interactive docs for the Velocity API. Authenticate with your <code className="text-primary font-mono text-sm">vi_live_*</code> API key.
      </p>
      <div
        id="swagger-ui"
        ref={containerRef}
        className="bg-[#080D16] border border-white/[0.06] rounded-xl overflow-hidden min-h-[600px]"
      />
    </div>
  )
}

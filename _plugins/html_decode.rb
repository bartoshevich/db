require 'cgi'

module Jekyll
  module HTMLDecodeFilter
    def html_decode(input)
      decoded = CGI.unescapeHTML(input)
      decoded = decoded.gsub('&nbsp;', ' ')
      decoded = decoded.gsub('&amp;', '&')
      decoded = decoded.gsub('&quot;', '"')
      decoded = decoded.gsub('&apos;', "'")
      decoded = decoded.gsub('&lt;', '<')
      decoded = decoded.gsub('&gt;', '>')
      decoded
    end
  end
end

Liquid::Template.register_filter(Jekyll::HTMLDecodeFilter)

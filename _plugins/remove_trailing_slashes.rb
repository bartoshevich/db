module Kramdown
  module Converter
    class Html < Base

      VOID_ELEMENTS = %w[area base br col embed hr img input link meta source track wbr].freeze

      # Определите метод convert_empty_tag, чтобы изменить форматирование пустых элементов
      def convert_empty_tag(el, _indent)
        if VOID_ELEMENTS.include?(el.value)
          "<#{el.value}#{html_attributes(el.attr)}>"
        else
          "<#{el.value}#{html_attributes(el.attr)}/>"
        end
      end

    end
  end
end





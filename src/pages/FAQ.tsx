import { useState, useMemo } from 'react';
import { HelpCircle } from 'lucide-react';
import { FAQSearch } from '@/components/faq/FAQSearch';
import { FAQCategoryFilter } from '@/components/faq/FAQCategoryFilter';
import { FAQItem } from '@/components/faq/FAQItem';
import { FAQEmptyState } from '@/components/faq/FAQEmptyState';
import { Accordion } from '@/components/ui/accordion';
import { faqItems } from '@/data/faqData';
import { FAQCategory } from '@/types/faq';

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory>('Todas');

  // Filter FAQ items
  const filteredItems = useMemo(() => {
    let items = faqItems;

    // Filter by category
    if (selectedCategory !== 'Todas') {
      items = items.filter((item) => item.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort by severity (error > warning > info)
    const severityOrder = { error: 0, warning: 1, info: 2 };
    return items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [searchQuery, selectedCategory]);

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Todas: faqItems.length,
    };

    faqItems.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });

    return counts;
  }, []);

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedCategory('Todas');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <HelpCircle className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Perguntas Frequentes</h1>
          <p className="mt-1 text-muted-foreground">
            Encontre respostas rápidas para os problemas mais comuns do sistema
          </p>
        </div>
      </div>

      {/* Search */}
      <FAQSearch value={searchQuery} onChange={setSearchQuery} />

      {/* Category Filter */}
      <FAQCategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categoryCounts={categoryCounts}
      />

      {/* FAQ List */}
      {filteredItems.length > 0 ? (
        <Accordion type="single" collapsible className="space-y-2">
          {filteredItems.map((item) => (
            <FAQItem key={item.id} item={item} />
          ))}
        </Accordion>
      ) : (
        <FAQEmptyState onClearSearch={handleClearSearch} />
      )}
    </div>
  );
}

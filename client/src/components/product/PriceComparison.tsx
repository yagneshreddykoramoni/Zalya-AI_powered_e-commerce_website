
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ExternalLink } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Retailer {
  name: string;
  price: number;
  url: string;
  rating: number;
  inStock: boolean;
}

interface PriceComparisonProps {
  productName: string;
  currentPrice: number;
}

const PriceComparison: React.FC<PriceComparisonProps> = ({ productName, currentPrice }) => {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock API call to get comparison data
    const fetchComparisons = async () => {
      setIsLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock retailers data
      const mockRetailers: Retailer[] = [
        {
          name: 'Our Store',
          price: currentPrice,
          url: '#',
          rating: 4.5,
          inStock: true
        },
        {
          name: 'RetailerOne',
          price: currentPrice * 1.15,
          url: 'https://example.com/1',
          rating: 4.2,
          inStock: true
        },
        {
          name: 'RetailerTwo',
          price: currentPrice * 0.95,
          url: 'https://example.com/2',
          rating: 4.0,
          inStock: false
        },
        {
          name: 'RetailerThree',
          price: currentPrice * 1.05,
          url: 'https://example.com/3',
          rating: 4.1,
          inStock: true
        }
      ];
      
      setRetailers(mockRetailers);
      setIsLoading(false);
    };

    fetchComparisons();
  }, [productName, currentPrice]);

  const sortedRetailers = [...retailers].sort((a, b) => a.price - b.price);
  const cheapestRetailer = sortedRetailers.length > 0 ? sortedRetailers[0] : null;
  const weAreCheapest = cheapestRetailer?.name === 'Our Store';

  return (
    <div className="mt-4 md:mt-0">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="group relative items-center gap-2 overflow-hidden border border-emerald-300/80 bg-white/75 text-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_22px_-18px_rgba(16,185,129,0.8)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-50/90 hover:text-emerald-950 hover:shadow-[0_16px_28px_-16px_rgba(16,185,129,0.75)] data-[state=open]:border-emerald-500 data-[state=open]:shadow-[0_18px_30px_-15px_rgba(16,185,129,0.75)] before:absolute before:inset-y-[-60%] before:left-[-40%] before:w-[45%] before:rotate-12 before:bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent before:opacity-0 before:transition-transform before:duration-300 before:content-[''] group-hover:before:translate-x-[220%] group-hover:before:opacity-70"
          >
            <ArrowUpDown size={16} />
            Price Comparison
            {!weAreCheapest && cheapestRetailer && (
              <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                Save ₹{(currentPrice - cheapestRetailer.price).toFixed(2)}
              </span>
            )}
            {weAreCheapest && (
              <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                Best Price!
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <h3 className="font-medium">Compare Prices for {productName}</h3>
            
            {isLoading ? (
              <div className="py-4 text-center">
                <p className="text-sm text-gray-500">Loading comparison data...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Retailer</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRetailers.map((retailer) => (
                    <TableRow key={retailer.name}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {retailer.name}
                          {retailer.name !== 'Our Store' && (
                            <a href={retailer.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink size={12} className="text-gray-400" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={retailer.name === 'Our Store' ? 'font-medium' : ''}>
                        ₹{retailer.price.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {retailer.inStock ? (
                          <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                            In Stock
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            Out of Stock
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            <div className="text-xs text-gray-500">
              <p>Prices last updated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default PriceComparison;


